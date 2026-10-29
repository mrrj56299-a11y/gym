import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { resolveUserFromRequest } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await resolveUserFromRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures; protected/admin
    // procedures still fail closed when no verified account is available.
    console.warn("[Auth] Session resolution failed", error instanceof Error ? error.message : "unknown error");
  }
  return { req: opts.req, res: opts.res, user };
}
