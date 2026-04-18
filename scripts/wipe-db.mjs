#!/usr/bin/env node
/**
 * One-shot: wipe all domain data from Neon for a clean dev slate.
 * Keeps: user_settings (theme/prefs).
 * Deletes everything else in FK-safe order.
 *
 * Run with:
 *   export DATABASE_URL='<from .env.local>'
 *   node scripts/wipe-db.mjs
 *
 * Or: `node --env-file=.env.local scripts/wipe-db.mjs`
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(url);

const steps = [
  ['match_results', 'DELETE FROM match_results'],
  ['match_events', 'DELETE FROM match_events'],
  ['participations', 'DELETE FROM participations'],
  ['matches', 'DELETE FROM matches'],
  ['decks', 'DELETE FROM decks'],
  ['commanders', 'DELETE FROM commanders'],
  ['group_members', 'DELETE FROM group_members'],
  ['groups', 'DELETE FROM groups'],
  // Preserve account players (linked to Clerk identity) — only purge guest/test players
  ['players', 'DELETE FROM players WHERE account_user_id IS NULL'],
];

for (const [label, query] of steps) {
  const before = await sql.query(`SELECT COUNT(*)::int AS n FROM ${label}`);
  await sql.query(query);
  console.log(`✓ ${label.padEnd(16)} cleared (${before[0].n} rows)`);
}

console.log('\nDone. user_settings preserved.');
