-- 0016_killed_by — who killed a player ("Killed by" panel, docs/STATS_REDESIGN_SPEC.md 1a)
--
-- Three nullable columns on match_events, meaningful only on
-- event_type = 'player_died' rows. NULL everywhere else and on every existing
-- row, so nothing is backfilled and the code deployed today keeps working
-- unchanged once this is applied.
--
--   death_cause               NULL = not specified, 'opponent', or 'self'
--   killer_participation_id   who dealt the killing blow (NULL for 'self')
--   killer_commander_id       which of the killer's commanders (partner decks)
--
-- A killer counts only on a player_died row that is NOT undone
-- (is_undone = false). Undo does not clear these columns.
--
-- No index: the columns are read per match, through the existing
-- match_events_match_id_is_undone_idx.
--
-- Idempotent: safe to re-run. Additive only: nothing is dropped or rewritten.
DO $$
BEGIN
  CREATE TYPE "public"."death_cause" AS ENUM ('opponent', 'self');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint
ALTER TABLE "match_events" ADD COLUMN IF NOT EXISTS "killer_participation_id" uuid REFERENCES "participations"("id");
--> statement-breakpoint
ALTER TABLE "match_events" ADD COLUMN IF NOT EXISTS "killer_commander_id" uuid REFERENCES "commanders"("id");
--> statement-breakpoint
ALTER TABLE "match_events" ADD COLUMN IF NOT EXISTS "death_cause" "public"."death_cause";
