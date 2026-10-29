import { createHash, randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, OAUTH_STATE_COOKIE } from "@shared/const";
import * as db from "../db";
import { createApplicationSession, hashToken } from "./auth";
import { getSessionCookieOptions } from "./cookies";

const STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function cleanOrigin(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid application origin");
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("HTTPS is required");
  return url.origin;
}

function setStateCookie(req: Request, res: Response, value: string) {
  res.cookie(OAUTH_STATE_COOKIE, value, {
    ...getSessionCookieOptions(req),
    maxAge: STATE_TTL_MS,
    httpOnly: true,
    path: "/",
  });
}

function clearStateCookie(req: Request, res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    ...getSessionCookieOptions(req),
    maxAge: 0,
    httpOnly: true,
    path: "/",
  });
}

function h(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function registerGoogleAuthRoutes(app: Express) {
  app.post("/api/auth/google/start", async (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: "Google sign-in is not configured yet." });
      return;
    }
    try {
      const originHeader = req.get("origin");
      if (!originHeader) {
        res.status(400).json({ error: "Start sign-in from the workout planner page." });
        return;
      }
      const origin = cleanOrigin(originHeader);
      const configured = (process.env.GOOGLE_ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      if (configured.length && !configured.map(cleanOrigin).includes(origin)) {
        res.status(403).json({ error: "This site is not enabled for Google sign-in." });
        return;
      }
      const redirectUri = new URL("/api/auth/google/callback", origin).toString();
      const state = randomBytes(32).toString("base64url");
      await db.createOAuthState(h(state), redirectUri, new Date(Date.now() + STATE_TTL_MS));
      setStateCookie(req, res, state);
      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("prompt", "select_account");
      res.json({ url: authUrl.toString() });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not start Google sign-in." });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookies = String(req.headers.cookie ?? "").split(";").map((piece) => piece.trim()).filter(Boolean);
    const statePair = cookies.find((piece) => piece.startsWith(`${OAUTH_STATE_COOKIE}=`));
    const cookieState = statePair ? decodeURIComponent(statePair.slice(OAUTH_STATE_COOKIE.length + 1)) : "";
    clearStateCookie(req, res);
    if (!code || !state || !cookieState || state !== cookieState) {
      res.status(403).send("Google sign-in could not be verified. Start again from the planner.");
      return;
    }
    try {
      const csrfRecord = await db.consumeOAuthState(h(state));
      if (!csrfRecord || csrfRecord.redirectUri !== new URL(csrfRecord.redirectUri).toString()) {
        res.status(403).send("This sign-in request has expired. Start again from the planner.");
        return;
      }
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        res.status(503).send("Google sign-in is not configured yet.");
        return;
      }
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: csrfRecord.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) throw new Error("Google rejected the sign-in token exchange");
      const tokens = await tokenResponse.json() as { access_token?: string; token_type?: string };
      if (!tokens.access_token) throw new Error("Google did not return an access token");
      const userResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!userResponse.ok) throw new Error("Google profile could not be verified");
      const profile = await userResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!profile.sub || !profile.email || profile.email_verified !== true) {
        res.status(403).send("Use a Google account with a verified email address.");
        return;
      }
      const user = await db.getOrCreateGoogleUser({
        subject: profile.sub,
        email: profile.email,
        name: profile.name?.trim() || profile.email.split("@")[0],
      });
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      await createApplicationSession(req, res, user.id);
      // Redirect only to the fixed application root; no caller-supplied next URL is used.
      const appOrigin = new URL(csrfRecord.redirectUri).origin;
      res.redirect(302, `${appOrigin}/`);
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error instanceof Error ? error.message : "unknown error");
      res.status(500).send("Google sign-in could not be completed. Try again.");
    }
  });
}
