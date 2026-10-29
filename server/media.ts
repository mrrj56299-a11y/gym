import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { storagePut } from "./storage";

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
type MediaType = "video" | "gif" | "lottie" | "image";

type MediaValidation =
  | { ok: true; extension: string; contentType: string; mediaType: MediaType }
  | { ok: false; reason: string };

function startsWith(buffer: Buffer, signature: number[]) {
  return signature.every((byte, index) => buffer[index] === byte);
}

function isLottieJson(buffer: Buffer) {
  try {
    const value = JSON.parse(buffer.toString("utf8")) as Record<string, unknown>;
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.v === "string" &&
      Number.isFinite(value.fr) &&
      Number.isFinite(value.ip) &&
      Number.isFinite(value.op) &&
      Number.isFinite(value.w) &&
      Number.isFinite(value.h) &&
      Array.isArray(value.layers) &&
      value.layers.length <= 10000
    );
  } catch {
    return false;
  }
}

export function validateMediaBuffer(buffer: Buffer, declaredType: string, originalName: string): MediaValidation {
  if (!buffer.length) return { ok: false, reason: "The selected file is empty." };
  if (buffer.length > MAX_MEDIA_BYTES) return { ok: false, reason: "The file exceeds the 25 MB upload limit." };
  const extension = extname(originalName).toLowerCase();
  const type = declaredType.toLowerCase();
  if (extension === ".svg" || type === "image/svg+xml") {
    return { ok: false, reason: "Raw SVG uploads are not accepted. Upload a supported raster/video format or valid Lottie JSON." };
  }

  if ((extension === ".mp4" || extension === ".m4v") && type === "video/mp4" && buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return { ok: true, extension: ".mp4", contentType: "video/mp4", mediaType: "video" };
  }
  if (extension === ".webm" && type === "video/webm" && startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { ok: true, extension: ".webm", contentType: "video/webm", mediaType: "video" };
  }
  if (extension === ".gif" && type === "image/gif" && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return { ok: true, extension: ".gif", contentType: "image/gif", mediaType: "gif" };
  }
  if (extension === ".webp" && type === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { ok: true, extension: ".webp", contentType: "image/webp", mediaType: "image" };
  }
  if (extension === ".png" && type === "image/png" && startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, extension: ".png", contentType: "image/png", mediaType: "image" };
  }
  if ((extension === ".jpg" || extension === ".jpeg") && type === "image/jpeg" && startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { ok: true, extension: ".jpg", contentType: "image/jpeg", mediaType: "image" };
  }
  if (extension === ".json" && type === "application/json" && isLottieJson(buffer)) {
    return { ok: true, extension: ".json", contentType: "application/json", mediaType: "lottie" };
  }
  return { ok: false, reason: "The file extension, MIME type, and file contents do not match an allowed format." };
}

export async function uploadExerciseMedia(buffer: Buffer, contentType: string, extension: string) {
  const key = `exercise-media/${randomUUID()}${extension}`;
  const uploaded = await storagePut(key, buffer, contentType);
  return {
    ...uploaded,
    posterUrl: contentType.startsWith("image/") ? uploaded.url : undefined,
  };
}
