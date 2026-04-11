/**
 * Shared TypeScript interfaces — MTG Commander Tracker
 * Domain entities defined here match docs/planning/06_DATA_MODEL.md
 * Full schema implementation: EPIC-01 (Data Foundation)
 */

// Match status
export type MatchStatus = 'in_progress' | 'completed' | 'abandoned';

// Win conditions (BR-MATCH-09)
export type WinCondition =
  | 'combat_damage'
  | 'commander_damage'
  | 'infect'
  | 'combo'
  | 'mill'
  | 'scoop'
  | 'concede'
  | 'other';

// Participation result
export type ParticipationResult = 'win' | 'lose' | 'draw' | null;

// MTG color identity (WUBRG)
export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

// Auth providers
export type AuthProvider = 'email' | 'google' | 'apple' | 'magic_link';

// Group membership roles
export type GroupRole = 'owner' | 'member';
