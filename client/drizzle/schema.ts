import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core account rows; `openId` remains for compatibility with Manus OAuth. */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    emailNormalized: varchar("email_normalized", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({ emailUnique: uniqueIndex("users_email_normalized_unique").on(table.emailNormalized) }),
);

export const authIdentities = mysqlTable(
  "auth_identities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: mysqlEnum("provider", ["email", "google", "manus"]).notNull(),
    providerSubject: varchar("provider_subject", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    providerSubjectUnique: uniqueIndex("auth_identities_provider_subject_unique").on(table.provider, table.providerSubject),
    userIdx: index("auth_identities_user_idx").on(table.userId),
  }),
);

export const passwordCredentials = mysqlTable("password_credentials", {
  userId: int("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const userSessions = mysqlTable(
  "user_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (table) => ({ userIdx: index("user_sessions_user_idx").on(table.userId) }),
);

export const oauthStates = mysqlTable("oauth_states", {
  stateHash: varchar("state_hash", { length: 64 }).primaryKey(),
  redirectUri: varchar("redirect_uri", { length: 1024 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const muscles = mysqlTable(
  "muscles",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 180 }).notNull(),
    nameEn: varchar("name_en", { length: 180 }).notNull(),
    view: mysqlEnum("view", ["front", "back", "both"]).default("both").notNull(),
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
);

export const subMuscles = mysqlTable(
  "sub_muscles",
  {
    id: int("id").autoincrement().primaryKey(),
    muscleId: int("muscle_id").notNull().references(() => muscles.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 180 }).notNull(),
    nameEn: varchar("name_en", { length: 180 }).notNull(),
    svgPathId: varchar("svg_path_id", { length: 120 }),
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ muscleIdx: index("sub_muscles_muscle_idx").on(table.muscleId) }),
);

export const exercises = mysqlTable(
  "exercises",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 220 }).notNull(),
    nameEn: varchar("name_en", { length: 220 }).notNull(),
    equipment: mysqlEnum("equipment", ["machine", "dumbbell", "barbell", "cable", "bodyweight"]).notNull(),
    level: mysqlEnum("level", ["beginner", "intermediate"]).notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    stepsAr: text("steps_ar").notNull(),
    stepsEn: text("steps_en").notNull(),
    mistakesAr: text("mistakes_ar").notNull(),
    mistakesEn: text("mistakes_en").notNull(),
    mediaUrl: varchar("media_url", { length: 1024 }),
    mediaType: mysqlEnum("media_type", ["video", "gif", "lottie", "image", "svg"]).default("image"),
    posterUrl: varchar("poster_url", { length: 1024 }),
    status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ statusIdx: index("exercises_status_idx").on(table.status) }),
);

export const exerciseTargets = mysqlTable(
  "exercise_targets",
  {
    exerciseId: int("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    subMuscleId: int("sub_muscle_id").notNull().references(() => subMuscles.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["primary", "secondary"]).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exerciseId, table.subMuscleId] }),
    subIdx: index("exercise_targets_sub_idx").on(table.subMuscleId, table.role),
  }),
);

export const splits = mysqlTable(
  "splits",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    nameAr: varchar("name_ar", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    daysCount: int("days_count").notNull(),
    descriptionAr: text("description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    level: mysqlEnum("level", ["beginner", "intermediate"]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("splits_owner_idx").on(table.ownerUserId),
    slugOwnerIdx: index("splits_slug_owner_idx").on(table.slug, table.ownerUserId),
  }),
);

export const splitDays = mysqlTable(
  "split_days",
  {
    id: int("id").autoincrement().primaryKey(),
    splitId: int("split_id").notNull().references(() => splits.id, { onDelete: "cascade" }),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    position: int("position").notNull(),
  },
  (table) => ({ splitIdx: index("split_days_split_idx").on(table.splitId) }),
);

export const splitDayMuscles = mysqlTable(
  "split_day_muscles",
  {
    splitDayId: int("split_day_id").notNull().references(() => splitDays.id, { onDelete: "cascade" }),
    muscleId: int("muscle_id").notNull().references(() => muscles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.splitDayId, table.muscleId] }),
    muscleIdx: index("split_day_muscles_muscle_idx").on(table.muscleId),
  }),
);

export const schedules = mysqlTable(
  "schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 180 }).notNull(),
    splitId: int("split_id").references(() => splits.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ userIdx: index("schedules_user_idx").on(table.userId) }),
);

export const scheduleDays = mysqlTable(
  "schedule_days",
  {
    id: int("id").autoincrement().primaryKey(),
    scheduleId: int("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    position: int("position").notNull(),
    splitDayId: int("split_day_id").references(() => splitDays.id, { onDelete: "set null" }),
  },
  (table) => ({ scheduleIdx: index("schedule_days_schedule_idx").on(table.scheduleId) }),
);

export const scheduleItems = mysqlTable(
  "schedule_items",
  {
    id: int("id").autoincrement().primaryKey(),
    dayId: int("day_id").notNull().references(() => scheduleDays.id, { onDelete: "cascade" }),
    exerciseId: int("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
    sets: int("sets").notNull().default(3),
    reps: varchar("reps", { length: 24 }).notNull().default("8–12"),
    restSeconds: int("rest_seconds").notNull().default(90),
    position: int("position").notNull(),
  },
  (table) => ({ dayIdx: index("schedule_items_day_idx").on(table.dayId) }),
);

export const siteTexts = mysqlTable(
  "site_texts",
  {
    id: int("id").autoincrement().primaryKey(),
    textKey: varchar("text_key", { length: 160 }).notNull(),
    locale: mysqlEnum("locale", ["ar", "en"]).notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ keyLocaleUnique: uniqueIndex("site_texts_key_locale_unique").on(table.textKey, table.locale) }),
);

export const rateLimits = mysqlTable("rate_limits", {
  bucket: varchar("bucket", { length: 120 }).primaryKey(),
  hits: int("hits").notNull().default(0),
  windowStart: timestamp("window_start").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Muscle = typeof muscles.$inferSelect;
export type SubMuscle = typeof subMuscles.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Split = typeof splits.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
