/*
# Create routines tables

1. New Tables
- `routines`: a named, multi-day workout routine saved by one app user.
  - `id` (bigint identity, primary key)
  - `owner_id` (integer, the app user's id; not a Supabase auth user)
  - `name` (text), `created_at`, `updated_at`
- `routine_days`: the training days inside a routine, in order.
  - `routine_id` (cascades on routine delete), `position`, `name`
- `routine_exercises`: exercises planned for a routine day.
  - `day_id` (cascades on day delete), `position`, `exercise_id` (app exercise id)
  - `exercise_name_ar`, `exercise_name_en`, `equipment`, `level` (snapshot at save time)
  - `planned_sets`, `planned_reps`, `rest_seconds`
- `routine_set_logs`: the weight and reps the user actually lifted for each set.
  - `routine_exercise_id` (cascades), `set_number`, `weight_kg`, `reps`, `updated_at`
  - One log per set per exercise (unique).

2. Security
- Row level security is enabled on all four tables.
- No policies are granted to `anon` or `authenticated`: browsers cannot read or write these tables directly.
- Only `service_role` (used by the server, which checks the signed-in user on every request) has access.

3. Notes
- Ownership is enforced in the server routes using `owner_id`, which is the app's own user id.
- Deleting a routine removes its days, exercises and logs.
*/

CREATE TABLE IF NOT EXISTS routines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id integer NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routine_days (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  routine_id bigint NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  position integer NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id bigint NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  position integer NOT NULL,
  exercise_id integer NOT NULL,
  exercise_name_ar text NOT NULL,
  exercise_name_en text NOT NULL,
  equipment text NOT NULL,
  level text NOT NULL,
  planned_sets integer NOT NULL,
  planned_reps text NOT NULL,
  rest_seconds integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS routine_set_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  routine_exercise_id bigint NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight_kg numeric(7,2),
  reps integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS routines_owner_idx ON routines (owner_id);
CREATE INDEX IF NOT EXISTS routine_days_routine_idx ON routine_days (routine_id);
CREATE INDEX IF NOT EXISTS routine_exercises_day_idx ON routine_exercises (day_id);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_set_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON routines, routine_days, routine_exercises, routine_set_logs TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
