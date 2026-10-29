import { randomBytes, createHash, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const MIN_PASSWORD_LENGTH = 12;
const deriveScrypt = (password: string, salt: Buffer, length: number) => new Promise<Buffer>((resolve, reject) => {
  nodeScrypt(password, salt, length, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
    if (error) reject(error);
    else resolve(derived as Buffer);
  });
});
export const APPLICATION_SESSION_MS = 1000 * 60 * 60 * 24 * 30;

export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await deriveScrypt(password, salt, 64);
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = stored.split("$");
  if (algorithm !== "scrypt" || nValue !== "32768" || rValue !== "8" || pValue !== "1" || !saltValue || !hashValue) return false;
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await deriveScrypt(password, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function validatePassword(password: string) { return password.length >= MIN_PASSWORD_LENGTH && password.length <= 128; }
export function validateEmail(email: string) { return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

export function getCookieValue(req: Request, name = COOKIE_NAME) {
  try { return parseCookie(req.headers.cookie ?? "")[name]; }
  catch { return undefined; }
}

export async function resolveUserFromRequest(req: Request) {
  const customToken = getCookieValue(req);
  if (customToken) {
    const user = await db.getUserBySessionHash(hashToken(customToken));
    if (user) return user;
  }
  // Keep the starter's HS256 validation for real Preview auto-login and Manus OAuth.
  // Never infer identity or privilege from NODE_ENV, an email address, or a client hint.
  try { return await sdk.authenticateRequest(req); }
  catch { return null; }
}

export async function createApplicationSession(req: Request, res: Response, userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + APPLICATION_SESSION_MS);
  await db.createUserSession(userId, hashToken(token), expiresAt);
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req), maxAge: APPLICATION_SESSION_MS, httpOnly: true, path: "/",
  });
}

export async function clearApplicationSession(req: Request, res: Response) {
  const token = getCookieValue(req);
  if (token) await db.deleteUserSession(hashToken(token));
  res.clearCookie(COOKIE_NAME, {
    ...getSessionCookieOptions(req), maxAge: 0, httpOnly: true, path: "/",
  });
}

function requestIp(req: Request) { return req.ip || req.socket.remoteAddress || "unknown"; }

export async function checkAuthRateLimit(req: Request, email: string) {
  const ip = hashToken(requestIp(req)).slice(0, 32);
  const emailKey = hashToken(normalizeEmail(email)).slice(0, 32);
  return db.consumeRateLimit(`auth:${ip}:${emailKey}`, 15 * 60 * 1000, 10);
}

export async function checkAdminRateLimit(req: Request, userId: number) {
  const ip = hashToken(requestIp(req)).slice(0, 32);
  const [perUser, perIp] = await Promise.all([
    db.consumeRateLimit(`admin:user:${userId}`, 60 * 1000, 180),
    db.consumeRateLimit(`admin:ip:${ip}`, 60 * 1000, 240),
  ]);
  return perUser && perIp;
}

export function registerMediaUploadRoute(app: Express) {
  // Validate authorization before reading a bounded raw request body.
  app.post("/api/admin/media", async (req: Request, res: Response, next) => {
    const user = await resolveUserFromRequest(req);
    if (!user || user.role !== "admin") {
      res.status(user ? 403 : 401).json({ error: "You do not have permission to upload media." });
      return;
    }
    if (!(await checkAdminRateLimit(req, user.id))) {
      res.status(429).json({ error: "Too many admin requests. Try again shortly." });
      return;
    }
    next();
  }, async (req: Request, res: Response, next) => {
    const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    const allowed = new Set(["video/mp4", "video/webm", "image/gif", "image/webp", "image/png", "image/jpeg", "application/json"]);
    if (!allowed.has(contentType)) {
      res.status(415).json({ error: "Allowed files: MP4, WebM, GIF, WebP, PNG, JPG, or valid Lottie JSON." });
      return;
    }
    let size = 0;
    let tooLarge = false;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 25 * 1024 * 1024) { tooLarge = true; chunks.length = 0; }
      else if (!tooLarge) chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (tooLarge) {
        res.status(413).json({ error: "The file exceeds the 25 MB upload limit." });
        return;
      }
      const body = req as Request & { uploadBuffer?: Buffer; uploadContentType?: string };
      body.uploadBuffer = Buffer.concat(chunks);
      body.uploadContentType = contentType;
      next();
    });
    req.on("error", next);
  }, async (req: Request, res: Response) => {
    try {
      const uploadReq = req as Request & { uploadBuffer?: Buffer; uploadContentType?: string };
      const buffer = uploadReq.uploadBuffer;
      const contentType = uploadReq.uploadContentType ?? "";
      const name = String(req.headers["x-file-name"] ?? "exercise-media").slice(0, 100);
      if (!buffer?.length) { res.status(400).json({ error: "Choose a non-empty media file." }); return; }
      const { validateMediaBuffer, uploadExerciseMedia } = await import("../media");
      const validation = validateMediaBuffer(buffer, contentType, name);
      if (!validation.ok) { res.status(400).json({ error: validation.reason }); return; }
      const uploaded = await uploadExerciseMedia(buffer, validation.contentType, validation.extension);
      res.status(201).json({ url: uploaded.url, mediaType: validation.mediaType, posterUrl: uploaded.posterUrl ?? null });
    } catch (error) {
      console.error("[Media] Upload failed", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ error: "The media upload could not be completed. Check storage configuration and try again." });
    }
  });
}
