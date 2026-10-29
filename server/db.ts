import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomUUID } from "node:crypto";
import {
  authIdentities,
  exercises,
  exerciseTargets,
  muscles,
  oauthStates,
  passwordCredentials,
  rateLimits,
  schedules,
  scheduleDays,
  scheduleItems,
  splitDayMuscles,
  splitDays,
  splits,
  subMuscles,
  userSessions,
  users,
  type InsertUser,
  type User,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "emailNormalized", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const result = await db.select().from(users).where(eq(users.emailNormalized, normalized)).limit(1);
  return result[0];
}

export async function findEmailCredential(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = email.trim().toLowerCase();
  const result = await db
    .select({ user: users, credential: passwordCredentials })
    .from(users)
    .innerJoin(passwordCredentials, eq(passwordCredentials.userId, users.id))
    .where(eq(users.emailNormalized, normalized))
    .limit(1);
  return result[0];
}

export async function createEmailUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = input.email.trim();
  const normalized = email.toLowerCase();
  const openId = `gym_${randomUUID().replace(/-/g, "")}`;
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      openId,
      name: input.name.trim(),
      email,
      emailNormalized: normalized,
      loginMethod: "email",
      role: "user",
      lastSignedIn: new Date(),
    });
    const userRows = await tx.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
    const userId = userRows[0]?.id;
    if (!userId) throw new Error("Could not create account");
    await tx.insert(passwordCredentials).values({ userId, passwordHash: input.passwordHash });
    await tx.insert(authIdentities).values({ userId, provider: "email", providerSubject: normalized });
  });
  const created = await getUserByOpenId(openId);
  if (!created) throw new Error("Could not load created account");
  return created;
}

export async function findGoogleUser(subject: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ user: users })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(and(eq(authIdentities.provider, "google"), eq(authIdentities.providerSubject, subject)))
    .limit(1);
  return rows[0]?.user;
}

export async function getOrCreateGoogleUser(input: {
  subject: string;
  email: string;
  name: string;
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existingIdentity = await findGoogleUser(input.subject);
  if (existingIdentity) return existingIdentity;
  const normalized = input.email.trim().toLowerCase();
  const openId = `gym_${randomUUID().replace(/-/g, "")}`;
  await db.transaction(async (tx) => {
    let userRows = await tx.select().from(users).where(eq(users.emailNormalized, normalized)).limit(1);
    let user = userRows[0];
    if (!user) {
      await tx.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        emailNormalized: normalized,
        loginMethod: "google",
        role: "user",
        lastSignedIn: new Date(),
      });
      userRows = await tx.select().from(users).where(eq(users.openId, openId)).limit(1);
      user = userRows[0];
    }
    if (!user) throw new Error("Could not create Google account");
    await tx.insert(authIdentities).values({ userId: user.id, provider: "google", providerSubject: input.subject });
  });
  const user = await findGoogleUser(input.subject);
  if (!user) throw new Error("Could not load Google account");
  return user;
}

export async function createUserSession(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(userSessions).values({ userId, tokenHash, expiresAt, lastSeenAt: new Date() });
}

export async function getUserBySessionHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ user: users, sessionId: userSessions.id })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(and(eq(userSessions.tokenHash, tokenHash), gt(userSessions.expiresAt, new Date())))
    .limit(1);
  if (!rows[0]) return undefined;
  await db.update(userSessions).set({ lastSeenAt: new Date() }).where(eq(userSessions.id, rows[0].sessionId));
  return rows[0].user;
}

export async function deleteUserSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userSessions).where(eq(userSessions.tokenHash, tokenHash));
}

export async function consumeRateLimit(bucket: string, windowMs: number, maxHits: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  await db.insert(rateLimits).values({ bucket, hits: 1, windowStart: now }).onDuplicateKeyUpdate({
    set: {
      hits: sql`IF(${rateLimits.windowStart} <= ${cutoff}, 1, ${rateLimits.hits} + 1)`,
      windowStart: sql`IF(${rateLimits.windowStart} <= ${cutoff}, ${now}, ${rateLimits.windowStart})`,
    },
  });
  const rows = await db.select().from(rateLimits).where(eq(rateLimits.bucket, bucket)).limit(1);
  return (rows[0]?.hits ?? maxHits + 1) <= maxHits;
}

export async function createOAuthState(stateHash: string, redirectUri: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(oauthStates).values({ stateHash, redirectUri, expiresAt });
}

export async function consumeOAuthState(stateHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(oauthStates).where(and(eq(oauthStates.stateHash, stateHash), gt(oauthStates.expiresAt, new Date()))).limit(1);
  if (!rows[0]) return undefined;
  await db.delete(oauthStates).where(eq(oauthStates.stateHash, stateHash));
  return rows[0];
}

export async function listMusclesWithParts() {
  const db = await getDb();
  if (!db) return [];
  const allMuscles = await db.select().from(muscles).orderBy(muscles.position, muscles.nameEn);
  const parts = await db.select().from(subMuscles).orderBy(subMuscles.position, subMuscles.nameEn);
  return allMuscles.map((muscle) => ({ ...muscle, subMuscles: parts.filter((part) => part.muscleId === muscle.id) }));
}

export async function listExercisesForSubMuscle(subMuscleId: number, splitDayId?: number, requesterId?: number) {
  const db = await getDb();
  if (!db) return [];
  const selectedTargets = await db.select({ exerciseId: exerciseTargets.exerciseId }).from(exerciseTargets).where(eq(exerciseTargets.subMuscleId, subMuscleId));
  let allowedMuscleIds: number[] | undefined;
  if (splitDayId) {
    const dayRows = await db
      .select({ split: splits, splitDay: splitDays })
      .from(splitDays)
      .innerJoin(splits, eq(splitDays.splitId, splits.id))
      .where(eq(splitDays.id, splitDayId))
      .limit(1);
    const owner = dayRows[0]?.split.ownerUserId;
    if (!dayRows[0] || (owner !== null && owner !== requesterId)) throw new Error("Split day is not available to this user");
    const musclesForDay = await db.select({ muscleId: splitDayMuscles.muscleId }).from(splitDayMuscles).where(eq(splitDayMuscles.splitDayId, splitDayId));
    allowedMuscleIds = musclesForDay.map((item) => item.muscleId);
  }
  const candidateIds = Array.from(new Set(selectedTargets.map((item) => item.exerciseId)));
  if (!candidateIds.length || (allowedMuscleIds && !allowedMuscleIds.length)) return [];
  const primaryRows = await db
    .select({ exerciseId: exerciseTargets.exerciseId, muscleId: subMuscles.muscleId })
    .from(exerciseTargets)
    .innerJoin(subMuscles, eq(exerciseTargets.subMuscleId, subMuscles.id))
    .where(and(inArray(exerciseTargets.exerciseId, candidateIds), eq(exerciseTargets.role, "primary")));
  const allowedIds = new Set(primaryRows
    .filter((target) => !allowedMuscleIds || allowedMuscleIds.includes(target.muscleId))
    .map((target) => target.exerciseId));
  if (!allowedIds.size) return [];
  const exerciseRows = await db.select().from(exercises).where(and(inArray(exercises.id, [...allowedIds]), eq(exercises.status, "published")));
  const targetRows = await db
    .select({ exerciseId: exerciseTargets.exerciseId, subMuscle: subMuscles, role: exerciseTargets.role })
    .from(exerciseTargets)
    .innerJoin(subMuscles, eq(exerciseTargets.subMuscleId, subMuscles.id))
    .where(inArray(exerciseTargets.exerciseId, [...allowedIds]));
  return exerciseRows.map((exercise) => ({ ...exercise, targets: targetRows.filter((target) => target.exerciseId === exercise.id) }));
}

export async function listSplitsForUser(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = userId
    ? await db.select().from(splits).where(eq(splits.ownerUserId, userId)).orderBy(splits.nameEn)
    : [];
  const systemRows = await db.select().from(splits).where(isNull(splits.ownerUserId)).orderBy(splits.nameEn);
  const all = [...systemRows, ...rows];
  const dayRows = all.length
    ? await db.select().from(splitDays).where(inArray(splitDays.splitId, all.map((split) => split.id))).orderBy(splitDays.position)
    : [];
  const muscleRows = dayRows.length
    ? await db
        .select({ splitDayId: splitDayMuscles.splitDayId, muscle: muscles })
        .from(splitDayMuscles)
        .innerJoin(muscles, eq(splitDayMuscles.muscleId, muscles.id))
        .where(inArray(splitDayMuscles.splitDayId, dayRows.map((day) => day.id)))
    : [];
  return all.map((split) => ({
    ...split,
    days: dayRows.filter((day) => day.splitId === split.id).map((day) => ({
      ...day,
      muscles: muscleRows.filter((entry) => entry.splitDayId === day.id).map((entry) => entry.muscle),
    })),
  }));
}

export async function getScheduleForUser(scheduleId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId))).limit(1);
  const schedule = rows[0];
  if (!schedule) return undefined;
  const days = await db.select().from(scheduleDays).where(eq(scheduleDays.scheduleId, scheduleId)).orderBy(scheduleDays.position);
  const items = days.length
    ? await db
        .select({ item: scheduleItems, exercise: exercises })
        .from(scheduleItems)
        .innerJoin(exercises, eq(scheduleItems.exerciseId, exercises.id))
        .where(inArray(scheduleItems.dayId, days.map((day) => day.id)))
        .orderBy(scheduleItems.position)
    : [];
  return { ...schedule, days: days.map((day) => ({ ...day, items: items.filter((row) => row.item.dayId === day.id) })) };
}

export async function createScheduleForUser(input: {
  userId: number;
  name: string;
  splitId?: number | null;
  days: Array<{ name: string; splitDayId?: number | null; items: Array<{ exerciseId: number; sets: number; reps: string; restSeconds: number }> }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const schedule = await db.transaction(async (tx) => {
    const scheduleOpenId = `schedule_${randomUUID().replace(/-/g, "")}`;
    await tx.insert(schedules).values({ userId: input.userId, name: input.name.trim(), splitId: input.splitId ?? null });
    const scheduleRows = await tx.select().from(schedules).where(and(eq(schedules.userId, input.userId), eq(schedules.name, input.name.trim()))).orderBy(schedules.id);
    const created = scheduleRows.at(-1);
    if (!created) throw new Error(`Could not create schedule ${scheduleOpenId}`);
    for (const [position, day] of input.days.entries()) {
      await tx.insert(scheduleDays).values({ scheduleId: created.id, name: day.name, position, splitDayId: day.splitDayId ?? null });
      const dayRows = await tx.select().from(scheduleDays).where(and(eq(scheduleDays.scheduleId, created.id), eq(scheduleDays.position, position))).limit(1);
      const createdDay = dayRows[0];
      if (!createdDay) continue;
      if (day.items.length) {
        await tx.insert(scheduleItems).values(day.items.map((item, itemPosition) => ({
          dayId: createdDay.id,
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          restSeconds: item.restSeconds,
          position: itemPosition,
        })));
      }
    }
    return created;
  });
  return getScheduleForUser(schedule.id, input.userId);
}

export async function updateScheduleForUser(scheduleId: number, input: {
  userId: number; name: string; splitId?: number | null;
  days: Array<{ name: string; splitDayId?: number | null; items: Array<{ exerciseId: number; sets: number; reps: string; restSeconds: number }> }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const owned = await db.select({ id: schedules.id }).from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, input.userId))).limit(1);
  if (!owned[0]) throw new Error("Schedule is not available to this user");
  await db.transaction(async tx => {
    await tx.update(schedules).set({ name: input.name.trim(), splitId: input.splitId ?? null, updatedAt: new Date() }).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, input.userId)));
    const previous = await tx.select({ id: scheduleDays.id }).from(scheduleDays).where(eq(scheduleDays.scheduleId, scheduleId));
    if (previous.length) await tx.delete(scheduleDays).where(eq(scheduleDays.scheduleId, scheduleId));
    for (const [position, day] of input.days.entries()) {
      await tx.insert(scheduleDays).values({ scheduleId, name: day.name, position, splitDayId: day.splitDayId ?? null });
      const savedDay = await tx.select({ id: scheduleDays.id }).from(scheduleDays).where(and(eq(scheduleDays.scheduleId, scheduleId), eq(scheduleDays.position, position))).limit(1);
      if (savedDay[0] && day.items.length) await tx.insert(scheduleItems).values(day.items.map((item, itemPosition) => ({ dayId: savedDay[0].id, exerciseId: item.exerciseId, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds, position: itemPosition })));
    }
  });
  return getScheduleForUser(scheduleId, input.userId);
}

export async function deleteScheduleForUser(scheduleId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.delete(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)));
  return result;
}

export async function countAdmins() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return rows.length;
}

export async function promoteFirstAdmin(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const normalized = email.trim().toLowerCase();
  return db.transaction(async (tx) => {
    const adminRows = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (adminRows.length) throw new Error("An administrator already exists; bootstrap is closed");
    const userRows = await tx.select().from(users).where(eq(users.emailNormalized, normalized)).limit(1);
    const user = userRows[0];
    if (!user) throw new Error("Create an account with this email before running admin bootstrap");
    await tx.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, user.id));
    return user.id;
  });
}
