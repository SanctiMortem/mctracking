# Migrations kept for review

The real migrations live in `drizzle/`, which is gitignored, so a migration written on a branch cannot be reviewed from the branch. This folder holds a tracked copy of each one written that way.

Production migrations in this project are applied **by hand**, as idempotent SQL, after checking that the target is the production database (`mtg-tracker-prod`). They are not applied with `pnpm db:migrate`.

## 0016_killed_by.sql

Adds three nullable columns to `match_events` for the "Killed by" panel (`docs/STATS_REDESIGN_SPEC.md`, section 1a). Nothing is backfilled, dropped or rewritten, and the file is safe to run twice.

**Order to release in**

1. Apply this SQL to the production database. The code that is live today does not know the columns and is not affected by them.
2. Deploy the server (merge to `develop`).
3. Publish the app update (OTA).

**If the order is wrong**

- *Server deployed before the SQL:* nothing breaks. Writing events, Undo, opening a match and the sync poll do not name the new columns (`db/matchEventsCore.ts`). Only "Killed by" itself is off: the endpoint answers `503 KILLED_BY_UNAVAILABLE`, the app hides the panel, and each match that is opened makes one extra query that fails and is caught.
- *App update before the server:* nothing breaks. The panel stays hidden, because the old server never says it can store a killer.

**When copying it to `drizzle/`** name it `0016_killed_by.sql`. It only needs an entry in `drizzle/meta/_journal.json` if `pnpm db:migrate` is ever used against a database; applying by hand does not need one.
