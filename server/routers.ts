import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { plannerRouter } from "./routers/planner";
import { scheduleRouter } from "./routers/schedules";
import { splitRouter } from "./routers/splits";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  planner: plannerRouter,
  schedules: scheduleRouter,
  splits: splitRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
