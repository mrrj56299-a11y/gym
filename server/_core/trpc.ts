import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkAdminRateLimit } from "./auth";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: ctx.user ? "FORBIDDEN" : "UNAUTHORIZED", message: NOT_ADMIN_ERR_MSG });
  }
  if (!(await checkAdminRateLimit(ctx.req, ctx.user.id))) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many admin requests. Try again shortly." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
}));
