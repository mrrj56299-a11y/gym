import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createScheduleForUser, deleteScheduleForUser, getScheduleForUser, getDb, updateScheduleForUser } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { and, eq } from "drizzle-orm";
import { exerciseTargets, exercises, scheduleDays, schedules, splitDayMuscles, splitDays, subMuscles } from "../../drizzle/schema";
const item=z.object({exerciseId:z.number().int().positive(),sets:z.number().int().min(1).max(20),reps:z.string().min(1).max(24),restSeconds:z.number().int().min(0).max(1800)});
const day=z.object({name:z.string().trim().min(1).max(160),splitDayId:z.number().int().positive().nullable().optional(),items:z.array(item).max(60)});
export const scheduleRouter=router({
 list:protectedProcedure.query(async({ctx})=>{const db=await getDb();if(!db)return [];return db.select().from(schedules).where(eq(schedules.userId,ctx.user.id)).orderBy(schedules.updatedAt)}),
 get:protectedProcedure.input(z.object({id:z.number().int().positive()})).query(async({input,ctx})=>getScheduleForUser(input.id,ctx.user.id)),
 save:protectedProcedure.input(z.object({id:z.number().int().positive().optional(),name:z.string().trim().min(1).max(180),splitId:z.number().int().positive().nullable().optional(),days:z.array(day).min(1).max(14)})).mutation(async({input,ctx})=>{
  const db=await getDb();if(!db)throw new TRPCError({code:"INTERNAL_SERVER_ERROR"});
  for(const d of input.days){if(!d.splitDayId)continue;const allowed=await db.select({muscleId:splitDayMuscles.muscleId}).from(splitDayMuscles).where(eq(splitDayMuscles.splitDayId,d.splitDayId));const muscleIds=allowed.map(x=>x.muscleId);for(const i of d.items){const target=await db.select({id:exerciseTargets.exerciseId}).from(exerciseTargets).innerJoin(subMuscles,eq(exerciseTargets.subMuscleId,subMuscles.id)).where(and(eq(exerciseTargets.exerciseId,i.exerciseId),eq(exerciseTargets.role,"primary"))).limit(1); if(!target[0])throw new TRPCError({code:"BAD_REQUEST",message:"Exercise has no primary target for this training day."});const targetMuscle=await db.select({id:subMuscles.muscleId}).from(exerciseTargets).innerJoin(subMuscles,eq(exerciseTargets.subMuscleId,subMuscles.id)).where(and(eq(exerciseTargets.exerciseId,i.exerciseId),eq(exerciseTargets.role,"primary"))).limit(1);if(!targetMuscle[0]||!muscleIds.includes(targetMuscle[0].id))throw new TRPCError({code:"BAD_REQUEST",message:"Exercise no longer matches this day’s muscles."});}}
  const {id,...values}=input;const ownerInput={userId:ctx.user.id,...values,days:input.days.map(d=>({...d,items:d.items}))};return id?updateScheduleForUser(id,ownerInput):createScheduleForUser(ownerInput);}),
 delete:protectedProcedure.input(z.object({id:z.number().int().positive()})).mutation(async({input,ctx})=>{await deleteScheduleForUser(input.id,ctx.user.id);return {success:true}}),
});
