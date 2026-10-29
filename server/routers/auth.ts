import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { checkAuthRateLimit, clearApplicationSession, createApplicationSession, hashPassword, normalizeEmail, validateEmail, validatePassword, verifyPassword } from "../_core/auth";

const emailSchema = z.string().trim().max(320).email();
const publicUser = (user: { id: number; name: string | null; email: string | null; role: "user" | "admin"; loginMethod: string | null }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  loginMethod: user.loginMethod,
});

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user ? publicUser(ctx.user) : null),
  googleAvailable: publicProcedure.query(() => ({ enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) })),
  register: publicProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(80),
      email: emailSchema,
      password: z.string().min(1).max(128),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      if (!validateEmail(email)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid email address." });
      if (!validatePassword(input.password)) throw new TRPCError({ code: "BAD_REQUEST", message: "Use a password between 12 and 128 characters." });
      if (!(await checkAuthRateLimit(ctx.req, email))) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Try again in 15 minutes." });
      if (await db.findUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "An account already uses this email. Sign in with email or Google." });
      let user;
      try {
        user = await db.createEmailUser({ email, name: input.name, passwordHash: await hashPassword(input.password) });
      } catch (error) {
        if (String(error).includes("ER_DUP_ENTRY")) throw new TRPCError({ code: "CONFLICT", message: "An account already uses this email." });
        throw error;
      }
      await createApplicationSession(ctx.req, ctx.res, user.id);
      return publicUser(user);
    }),
  login: publicProcedure
    .input(z.object({ email: emailSchema, password: z.string().min(1).max(128) }))
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      if (!(await checkAuthRateLimit(ctx.req, email))) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Try again in 15 minutes." });
      const record = await db.findEmailCredential(email);
      if (!record) {
        await hashPassword(input.password); // Keep unknown-email responses close in cost to valid password verification.
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      }
      if (!(await verifyPassword(input.password, record.credential.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      }
      await db.upsertUser({ openId: record.user.openId, lastSignedIn: new Date() });
      await createApplicationSession(ctx.req, ctx.res, record.user.id);
      return publicUser(record.user);
    }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    await clearApplicationSession(ctx.req, ctx.res);
    return { success: true } as const;
  }),
});
