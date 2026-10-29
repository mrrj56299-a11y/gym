import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./google-auth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  registerGoogleAuthRoutes(app);
  app.post("/api/admin/media", async (req, res) => {
    const { resolveUserFromRequest, checkAdminRateLimit } = await import("./auth");
    const user = await resolveUserFromRequest(req);
    if (!user || user.role !== "admin") { res.status(user ? 403 : 401).json({ error: "Administrator access required." }); return; }
    if (!(await checkAdminRateLimit(req, user.id))) { res.status(429).json({ error: "Too many admin requests. Try again shortly." }); return; }
    const contentType = String(req.headers["content-type"] ?? "");
    const name = String(req.headers["x-file-name"] ?? "exercise-media");
    const save = async (buffer: Buffer) => {
      try {
        if (buffer.byteLength > 25 * 1024 * 1024) { res.status(413).json({ error: "The file exceeds the 25 MB upload limit." }); return; }
        const { validateMediaBuffer, uploadExerciseMedia } = await import("../media");
        const check = validateMediaBuffer(buffer, contentType, name);
        if (!check.ok) { res.status(400).json({ error: check.reason }); return; }
        const uploaded = await uploadExerciseMedia(buffer, check.contentType, check.extension);
        res.status(201).json({ url: uploaded.url, mediaType: check.mediaType, posterUrl: uploaded.posterUrl ?? null });
      } catch { res.status(500).json({ error: "Media upload failed. Check project storage configuration." }); }
    };
    // express.json consumes Lottie JSON before this route; handle its parsed body directly.
    if (contentType.toLowerCase().includes("application/json") && req.body && typeof req.body === "object") {
      void save(Buffer.from(JSON.stringify(req.body)));
      return;
    }
    const chunks: Buffer[] = []; let bytes = 0;
    req.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes <= 25 * 1024 * 1024) chunks.push(chunk); });
    req.on("end", () => { if (bytes > 25 * 1024 * 1024) { res.status(413).json({ error: "The file exceeds the 25 MB upload limit." }); return; } void save(Buffer.concat(chunks)); });
  });
  // Keep upload authorization and the 25 MB raw-body limit ahead of general parsers.
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
