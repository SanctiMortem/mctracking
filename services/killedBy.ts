/**
 * "Killed by" — the rules, with no database and no React in them.
 *
 * Shared by the server (services/deathKillers.ts, the PATCH route) and the
 * app (hooks/useKilledBy.ts, the tracker panel), so both sides agree on what
 * a valid selection is. Everything here is a pure function and is covered by
 * __tests__/unit/services/killedBy.test.ts.
 *
 * Spec: docs/STATS_REDESIGN_SPEC.md section 1a, decision 4.
 */

// ─────────────────────────────────────────────
// The selection
// ─────────────────────────────────────────────

export type DeathCause = 'opponent' | 'self';

/**
 * What is stored on a death. Three shapes are valid:
 *   not specified   { null, null, null }
 *   self-inflicted  { 'self', null, null }
 *   an opponent     { 'opponent', <participation>, <commander> | null }
 */
export type KillerSelection = {
  deathCause: DeathCause | null;
  killerParticipationId: string | null;
  killerCommanderId: string | null;
};

export const NO_KILLER: KillerSelection = Object.freeze({
  deathCause: null,
  killerParticipationId: null,
  killerCommanderId: null,
});

export const SELF_INFLICTED: KillerSelection = Object.freeze({
  deathCause: 'self' as const,
  killerParticipationId: null,
  killerCommanderId: null,
});

/** One dead player's current selection, as the server reports it. */
export type DeathKillerEntry = KillerSelection & { participationId: string };

export function isNoKiller(s: KillerSelection | null | undefined): boolean {
  return !s || s.deathCause === null;
}

export function sameKillerSelection(
  a: KillerSelection | null | undefined,
  b: KillerSelection | null | undefined,
): boolean {
  const x = a ?? NO_KILLER;
  const y = b ?? NO_KILLER;
  return (
    x.deathCause === y.deathCause &&
    x.killerParticipationId === y.killerParticipationId &&
    x.killerCommanderId === y.killerCommanderId
  );
}

/**
 * The panel's tap rule: tapping an option selects it, tapping another one
 * switches, tapping the selected one clears.
 */
export function toggleKillerSelection(
  current: KillerSelection | null | undefined,
  tapped: KillerSelection,
): KillerSelection {
  return sameKillerSelection(current, tapped) ? NO_KILLER : tapped;
}

// ─────────────────────────────────────────────
// Request body  (PATCH …/deaths/:participationId/killer)
// ─────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * The two ids in `/api/matches/:id/deaths/:participationId/killer`.
 *
 * `getRouteParam(req, 'id')` cannot be used for this route: it returns the
 * LAST uuid in the path, which here is the participation, not the match.
 */
export function parseKillerRoutePath(
  pathname: string,
): { matchId: string; participationId: string } | null {
  const m = /\/matches\/([^/]+)\/deaths\/([^/]+)\/killer\/?$/.exec(pathname);
  if (!m || !isUuid(m[1]) || !isUuid(m[2])) return null;
  return { matchId: m[1], participationId: m[2] };
}

export type ParsedKillerBody =
  | { ok: true; selection: KillerSelection }
  | { ok: false; message: string };

/**
 * Shape check only: the three fields, each null (or left out) or a string of
 * the right kind. Whether the selection makes sense for the match is
 * `validateKillerSelection`'s job.
 */
export function parseKillerBody(body: unknown): ParsedKillerBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Invalid JSON body' };
  }
  const { death_cause, killer_participation_id, killer_commander_id } = body as Record<string, unknown>;

  const cause = death_cause ?? null;
  if (cause !== null && cause !== 'opponent' && cause !== 'self') {
    return { ok: false, message: 'death_cause must be "opponent", "self" or null' };
  }
  const killer = killer_participation_id ?? null;
  if (killer !== null && !isUuid(killer)) {
    return { ok: false, message: 'killer_participation_id must be a uuid or null' };
  }
  const commander = killer_commander_id ?? null;
  if (commander !== null && !isUuid(commander)) {
    return { ok: false, message: 'killer_commander_id must be a uuid or null' };
  }

  return {
    ok: true,
    selection: {
      deathCause: cause,
      killerParticipationId: killer,
      killerCommanderId: commander,
    },
  };
}

// ─────────────────────────────────────────────
// Validation against the match
// ─────────────────────────────────────────────

/** A participation of the match and the commanders of its deck. */
export type KillerCandidate = {
  participationId: string;
  commanderIds: string[];
};

export type KillerValidationCode =
  /** A killer was sent with no death_cause. */
  | 'KILLER_WITHOUT_CAUSE'
  /** "self" carries no killer. */
  | 'SELF_WITH_KILLER'
  /** "opponent" needs to say who. */
  | 'OPPONENT_WITHOUT_KILLER'
  | 'KILLER_NOT_IN_MATCH'
  | 'KILLER_IS_DEAD_PLAYER'
  | 'COMMANDER_NOT_ON_KILLER_DECK';

export type KillerValidation =
  | { ok: true; selection: KillerSelection }
  | { ok: false; code: KillerValidationCode };

export const KILLER_VALIDATION_MESSAGES: Record<KillerValidationCode, string> = {
  KILLER_WITHOUT_CAUSE: 'A killer needs death_cause "opponent"',
  SELF_WITH_KILLER: 'death_cause "self" cannot carry a killer',
  OPPONENT_WITHOUT_KILLER: 'death_cause "opponent" needs killer_participation_id',
  KILLER_NOT_IN_MATCH: 'killer_participation_id does not belong to this match',
  KILLER_IS_DEAD_PLAYER: 'A player cannot be their own killer; use death_cause "self"',
  COMMANDER_NOT_ON_KILLER_DECK: "killer_commander_id is not one of the killer's commanders",
};

/**
 * Is this selection allowed for this dead player in this match?
 *
 * Deliberately NOT checked: whether the killer was still alive when the
 * player died. The panel only offers living players, but two devices can
 * briefly disagree about the order of two deaths, and the server refusing a
 * tap over that would be worse than accepting it.
 */
export function validateKillerSelection(input: {
  deadParticipationId: string;
  selection: KillerSelection;
  /** Every participation of the match. */
  participants: readonly KillerCandidate[];
}): KillerValidation {
  const { deadParticipationId, selection, participants } = input;
  const { deathCause, killerParticipationId, killerCommanderId } = selection;

  if (deathCause === null) {
    if (killerParticipationId !== null || killerCommanderId !== null) {
      return { ok: false, code: 'KILLER_WITHOUT_CAUSE' };
    }
    return { ok: true, selection: NO_KILLER };
  }

  if (deathCause === 'self') {
    if (killerParticipationId !== null || killerCommanderId !== null) {
      return { ok: false, code: 'SELF_WITH_KILLER' };
    }
    return { ok: true, selection: SELF_INFLICTED };
  }

  // 'opponent'
  if (killerParticipationId === null) {
    return { ok: false, code: 'OPPONENT_WITHOUT_KILLER' };
  }
  if (killerParticipationId === deadParticipationId) {
    return { ok: false, code: 'KILLER_IS_DEAD_PLAYER' };
  }
  const killer = participants.find((p) => p.participationId === killerParticipationId);
  if (!killer) {
    return { ok: false, code: 'KILLER_NOT_IN_MATCH' };
  }
  if (killerCommanderId !== null && !killer.commanderIds.includes(killerCommanderId)) {
    return { ok: false, code: 'COMMANDER_NOT_ON_KILLER_DECK' };
  }

  return {
    ok: true,
    selection: { deathCause: 'opponent', killerParticipationId, killerCommanderId },
  };
}

// ─────────────────────────────────────────────
// When a killer may be edited
// ─────────────────────────────────────────────

export type KillerEditState = 'editable' | 'window_expired' | 'not_editable';

/**
 * While the match is in progress, and for `windowMs` after a completed match
 * ended — the same window results can be edited in. An abandoned match is
 * never editable: it is not counted anywhere.
 */
export function killerEditState(
  match: { status: string; endedAt: Date | string | null },
  nowMs: number,
  windowMs: number,
): KillerEditState {
  if (match.status === 'in_progress') return 'editable';
  if (match.status !== 'completed') return 'not_editable';
  if (!match.endedAt) return 'window_expired';
  const endedMs = new Date(match.endedAt).getTime();
  if (!Number.isFinite(endedMs)) return 'window_expired';
  return nowMs - endedMs <= windowMs ? 'editable' : 'window_expired';
}

// ─────────────────────────────────────────────
// Which death a selection belongs to
// ─────────────────────────────────────────────

export type DeathRow = {
  participationId: string;
  createdAt: Date | string;
  deathCause: DeathCause | null;
  killerParticipationId: string | null;
  killerCommanderId: string | null;
};

/**
 * Collapse a match's non-undone `player_died` rows to one entry per dead
 * player — their LATEST death, which is the row the PATCH endpoint writes to
 * — ordered by when that death happened (oldest first).
 *
 * A player normally has one such row. Two appear when two devices mark the
 * same player dead inside one sync interval.
 *
 * `rows` must already be ordered oldest first.
 */
export function latestDeathPerParticipation(rows: readonly DeathRow[]): DeathKillerEntry[] {
  const latest = new Map<string, DeathRow>();
  for (const row of rows) {
    // Delete first so the entry moves to the end: Map keeps insertion order,
    // and the order wanted here is that of each player's latest death.
    latest.delete(row.participationId);
    latest.set(row.participationId, row);
  }
  return Array.from(latest.values(), (row) => ({
    participationId: row.participationId,
    deathCause: row.deathCause,
    killerParticipationId: row.killerParticipationId,
    killerCommanderId: row.killerCommanderId,
  }));
}

/** participationId → selection, leaving out deaths with nothing specified. */
export function killerMapFromEntries(
  entries: readonly DeathKillerEntry[],
): Record<string, KillerSelection> {
  const map: Record<string, KillerSelection> = {};
  for (const e of entries) {
    if (e.deathCause === null) continue;
    map[e.participationId] = {
      deathCause: e.deathCause,
      killerParticipationId: e.killerParticipationId,
      killerCommanderId: e.killerCommanderId,
    };
  }
  return map;
}

// ─────────────────────────────────────────────
// Who was alive when a player died
// ─────────────────────────────────────────────

/**
 * The order the currently dead players died in.
 *
 * The server's order is used for every death it knows about, so all devices
 * list the same options. A death this device has recorded but the server has
 * not reported yet goes last, in the order this device saw it: it is the
 * newest thing that has happened here.
 */
export function effectiveDeathOrder(
  serverOrder: readonly string[],
  localOrder: readonly string[],
  deadIds: ReadonlySet<string>,
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const pid of [...serverOrder, ...localOrder]) {
    if (!deadIds.has(pid) || seen.has(pid)) continue;
    seen.add(pid);
    order.push(pid);
  }
  // Dead players neither list mentions yet (first render after a death).
  for (const pid of deadIds) {
    if (!seen.has(pid)) order.push(pid);
  }
  return order;
}

/** The players who were already dead when `participationId` died. */
export function deadBefore(deathOrder: readonly string[], participationId: string): string[] {
  const idx = deathOrder.indexOf(participationId);
  return idx <= 0 ? [] : deathOrder.slice(0, idx);
}

// ─────────────────────────────────────────────
// What the panel offers
// ─────────────────────────────────────────────

export type KillerParticipant = {
  participationId: string;
  playerName: string;
  /** The deck's commanders; a partner deck has two. */
  commanders: readonly { id: string; name: string }[];
};

export type KillerOption = {
  /** Unique within one panel. */
  key: string;
  participationId: string;
  commanderId: string;
  commanderName: string;
  playerName: string;
};

/**
 * The buttons for one dead player: one per commander of each opponent who
 * was still alive when this player died, in seat order. Never the dead
 * player's own commanders.
 *
 * One exception keeps a saved choice from becoming invisible: if the current
 * selection points at a player this rule would leave out (two devices
 * disagreed about the order of two deaths), that player is offered too, so
 * the choice can still be seen and cleared.
 */
export function killerOptionsForDeath(input: {
  deadParticipationId: string;
  /** Every participation of the match, in seat order. */
  participants: readonly KillerParticipant[];
  /** Players already dead when this player died. */
  deadBefore: readonly string[];
  selection?: KillerSelection | null;
}): KillerOption[] {
  const { deadParticipationId, participants, selection } = input;
  const alreadyDead = new Set(input.deadBefore);
  const keep = selection?.deathCause === 'opponent' ? selection.killerParticipationId : null;

  const options: KillerOption[] = [];
  for (const p of participants) {
    if (p.participationId === deadParticipationId) continue;
    if (alreadyDead.has(p.participationId) && p.participationId !== keep) continue;
    for (const c of p.commanders) {
      options.push({
        key: `${p.participationId}:${c.id}`,
        participationId: p.participationId,
        commanderId: c.id,
        commanderName: c.name,
        playerName: p.playerName,
      });
    }
  }
  return options;
}

export function selectionForOption(option: KillerOption): KillerSelection {
  return {
    deathCause: 'opponent',
    killerParticipationId: option.participationId,
    killerCommanderId: option.commanderId,
  };
}

/**
 * Is this button the selected one? A selection that names a player but no
 * commander (the app never writes one, the API allows it) lights up every
 * commander of that player.
 */
export function isOptionSelected(
  selection: KillerSelection | null | undefined,
  option: KillerOption,
): boolean {
  if (!selection || selection.deathCause !== 'opponent') return false;
  if (selection.killerParticipationId !== option.participationId) return false;
  return selection.killerCommanderId === null || selection.killerCommanderId === option.commanderId;
}

// ─────────────────────────────────────────────
// Live sync
// ─────────────────────────────────────────────

/** Where this device's own write for one dead player stands. */
export type KillerWriteState = {
  /** A tap is waiting to be sent or its request has not come back. */
  busy: boolean;
  /** Device clock (ms) when the last request for this player came back. */
  settledAtMs: number;
};

/**
 * Fold the server's selections into this device's, without ever letting a
 * poll overwrite a newer local choice.
 *
 * The server's value wins for a dead player unless this device has a choice
 * the snapshot cannot know about yet:
 *   - a tap still waiting or in flight, or
 *   - a write that came back AFTER the poll was sent. Both times are read
 *     off this device's clock, so a wrong clock on the phone or the server
 *     cannot make a stale snapshot look fresh.
 *
 * "The server has nothing for this player" is adopted like any other value:
 * that is how a selection cleared on another device disappears here.
 *
 * Returns `local` itself when nothing changed, so a quiet poll re-renders
 * nothing.
 */
export function mergeRemoteKillers(input: {
  local: Readonly<Record<string, KillerSelection>>;
  remote: Readonly<Record<string, KillerSelection>>;
  /** Device clock (ms) when the poll that produced `remote` was sent. */
  requestedAtMs: number;
  writeState: (participationId: string) => KillerWriteState | undefined;
}): Record<string, KillerSelection> {
  const { local, remote, requestedAtMs, writeState } = input;
  const next: Record<string, KillerSelection> = {};
  let changed = false;

  for (const pid of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const mine = local[pid];
    const theirs = remote[pid];
    const ws = writeState(pid);
    const localIsNewer = !!ws && (ws.busy || requestedAtMs < ws.settledAtMs);
    const winner = localIsNewer ? mine : theirs;

    if (winner && winner.deathCause !== null) next[pid] = winner;
    if (!sameKillerSelection(winner, mine)) changed = true;
  }

  return changed ? next : (local as Record<string, KillerSelection>);
}
