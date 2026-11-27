/**
 * LABS — AI match narration on the match detail screen.
 *
 * `useNarration` loads the recap and per-event causes, but only when the
 * Labs switch is on for this device, so nobody else's app makes the call.
 * `NarrationRecap` renders the recap card; `NarrationCause` renders the
 * one-line cause under a log entry.
 *
 * Review (RCP-003): players of the match long-press a paragraph, key moment,
 * rules debate or log cause to hide it for everyone, and approve the draft;
 * it publishes to the pod once everyone seated has approved.
 * Roast (RCP-005): a satirical retelling written on this phone with the
 * user's own Claude key, from the visible recap and causes only.
 *
 * English only and self-contained: delete components/labs to remove it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { apiFetch } from '@/services/api';
import { isLabsEnabled } from '@/services/labs/aiKeys';
import { ROAST_FAILURE_TEXT, ROAST_MODEL, type RoastLogLine, runRoast } from '@/services/labs/roast';
import type { FlagKind, Narration, NarrationAnnotation, RoastLength } from '@/services/narration';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export type NarrationReview = {
  /** A review or roast request is in flight. */
  busy: boolean;
  /** Last failure, in words for the user; cleared by the next action. */
  error: string | null;
  flag: (kind: FlagKind, key: string) => void;
  unflagMine: () => void;
  setApproved: (approved: boolean) => void;
  roast: (length: RoastLength, log: RoastLogLine[]) => void;
  deleteRoast: () => void;
};

export type NarrationState = {
  narration: Narration | null;
  /** event id → cause, for quick lookup while rendering the log. */
  causes: Map<string, NarrationAnnotation>;
  review: NarrationReview;
};

const NO_CAUSES = new Map<string, NarrationAnnotation>();

type NarrationResponse = { success: true; data: Narration | null };

export function useNarration(matchId: string | undefined): NarrationState {
  const { getToken } = useAuth();
  const { i18n } = useTranslation();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [narration, setNarration] = useState<Narration | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const narrationRef = useRef(narration);
  narrationRef.current = narration;
  const language = i18n.language.startsWith('es') ? 'es' : 'en';

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await isLabsEnabled())) return;
        const token = await getTokenRef.current();
        const res = await apiFetch<NarrationResponse>(
          `/api/matches/${matchId}/narration`,
          'GET',
          undefined,
          token ?? undefined,
        );
        if (!cancelled) setNarration(res.data);
      } catch {
        // Experimental and optional: a failure just means no narration shown.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  /** One write; every route answers with the fresh narration. */
  const send = useCallback(
    async (path: 'narration' | 'roast', method: 'POST' | 'PUT' | 'DELETE', body?: unknown) => {
      const token = await getTokenRef.current();
      const res = await apiFetch<NarrationResponse>(
        `/api/matches/${matchId}/${path}`,
        method,
        body,
        token ?? undefined,
      );
      setNarration(res.data);
    },
    [matchId],
  );

  const run = useCallback(async (work: () => Promise<string | null | void>) => {
    setBusy(true);
    setError(null);
    try {
      const failure = await work();
      if (failure) setError(failure);
    } catch {
      setError('Could not save that. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const review = useMemo<NarrationReview>(
    () => ({
      busy,
      error,
      flag: (kind, key) => void run(() => send('narration', 'POST', { action: 'flag', kind, key })),
      unflagMine: () => void run(() => send('narration', 'POST', { action: 'unflag_mine' })),
      setApproved: (approved) =>
        void run(() => send('narration', 'POST', { action: approved ? 'approve' : 'unapprove' })),
      roast: (length, log) =>
        void run(async () => {
          const current = narrationRef.current;
          if (!current) return null;
          const outcome = await runRoast(current, log, length, language);
          if (!outcome.ok) return ROAST_FAILURE_TEXT[outcome.reason];
          await send('roast', 'PUT', { length, content: outcome.roast, model: ROAST_MODEL });
          return null;
        }),
      deleteRoast: () => void run(() => send('roast', 'DELETE')),
    }),
    [busy, error, run, send, language],
  );

  return useMemo(
    () => ({
      narration,
      causes: narration ? new Map(narration.annotations.map((a) => [a.event_id, a])) : NO_CAUSES,
      review,
    }),
    [narration, review],
  );
}

const DAMAGE_LABELS: Record<string, string> = {
  combat: 'combat',
  commander: 'commander damage',
  spell: 'spell',
  ability: 'ability',
  lifegain: 'life gain',
  other: 'other',
};

/** "Faisan · Temple Garden · other" — also what the roast is told about a log entry. */
export function causeLabel(cause: NarrationAnnotation): string {
  return [cause.source_player, cause.source_card, DAMAGE_LABELS[cause.damage_type] ?? cause.damage_type]
    .filter(Boolean)
    .join(' · ');
}

function confirmHide(onConfirm: () => void) {
  Alert.alert(
    'Hide this part?',
    'It disappears from the recap for everyone, and any roast is deleted. You can bring back what you hid.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export function NarrationRecap({
  narration,
  review,
  log,
}: {
  narration: Narration | null;
  review: NarrationReview;
  /** Log entries that have a visible cause, in order — the roast's second input. */
  log: RoastLogLine[];
}) {
  const styles = useThemedStyles(createStyles);
  const [showSpeakers, setShowSpeakers] = useState(false);
  if (!narration) return null;

  const canFlag = narration.can_review && !review.busy;
  const flaggable = (kind: FlagKind, key: string) =>
    canFlag ? { onLongPress: () => confirmHide(() => review.flag(kind, key)), delayLongPress: 450 } : {};
  const isDraft = narration.status === 'draft';
  const iHaveAVote = narration.can_review && narration.approvals.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        AI recap{isDraft ? '  ·  draft' : ''}
      </Text>
      <View style={styles.card}>
        <Text style={styles.headline}>{narration.headline}</Text>
        {narration.paragraphs.map((p) => (
          <Pressable key={p.id} {...flaggable('paragraph', p.id)}>
            <Text style={styles.body}>{p.text}</Text>
          </Pressable>
        ))}

        {narration.moments.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Key moments</Text>
            {narration.moments.map((m) => (
              <Pressable key={m.id} {...flaggable('moment', m.id)}>
                <Text style={styles.body}>• {m.text}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {narration.debates.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Rules debates</Text>
            {narration.debates.map((d) => (
              <Pressable key={d.id} {...flaggable('debate', d.id)}>
                <Text style={styles.body}>
                  <Text style={styles.strong}>{d.question}</Text> — {d.outcome}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.meta}>
          {narration.annotations.length} log entries explained
          {narration.model ? `  ·  ${narration.model}` : ''}
        </Text>

        {narration.speakers.length > 0 && (
          <View style={styles.block}>
            <TouchableOpacity onPress={() => setShowSpeakers((v) => !v)} hitSlop={8}>
              <Text style={styles.link}>{showSpeakers ? 'Hide' : 'Show'} who was heard</Text>
            </TouchableOpacity>
            {showSpeakers &&
              narration.speakers.map((s) => (
                <Text key={s.label} style={styles.meta}>
                  {s.label} → {s.player ?? 'unknown'} ({Math.round(s.confidence * 100)}%) — {s.evidence}
                </Text>
              ))}
          </View>
        )}

        {/* ── Review: hide parts, approve the draft ── */}
        {(narration.can_review || narration.hidden_count > 0) && (
          <View style={[styles.block, styles.divided]}>
            <Text style={styles.blockTitle}>Review</Text>
            {narration.can_review && (
              <Text style={styles.meta}>
                Press and hold a paragraph, a key moment, a rules debate or a log cause to hide it for everyone.
              </Text>
            )}
            {narration.hidden_count > 0 && (
              <View style={styles.row}>
                <Text style={styles.meta}>
                  {narration.hidden_count} {narration.hidden_count === 1 ? 'part' : 'parts'} hidden
                </Text>
                {narration.my_flags.length > 0 && (
                  <TouchableOpacity onPress={review.unflagMine} disabled={review.busy} hitSlop={8}>
                    <Text style={styles.link}>Bring back the {narration.my_flags.length} I hid</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {narration.approvals.length > 0 && (
              <Text style={styles.meta}>
                {narration.approvals.map((a) => `${a.approved ? '✓' : '…'} ${a.player}`).join('    ')}
              </Text>
            )}
            {isDraft && iHaveAVote && (
              <>
                <TouchableOpacity
                  style={[styles.button, narration.i_approved && styles.buttonQuiet]}
                  onPress={() => review.setApproved(!narration.i_approved)}
                  disabled={review.busy}
                >
                  <Text style={[styles.buttonText, narration.i_approved && styles.buttonTextQuiet]}>
                    {narration.i_approved ? 'Approved — tap to take it back' : 'Approve this recap'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.meta}>
                  Only the players can see a draft. It is published to the pod when everyone has approved.
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── Roast ── */}
        <View style={[styles.block, styles.divided]}>
          <Text style={styles.blockTitle}>Roast</Text>
          {narration.roast ? (
            <>
              {narration.roast.content.split(/\n\s*\n/).map((p, i) => (
                <Text key={i} style={styles.body}>{p.trim()}</Text>
              ))}
              <Text style={styles.meta}>
                {narration.roast.length} roast{narration.roast.model ? `  ·  ${narration.roast.model}` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>
              A satirical retelling of this match, written from the recap above with your Claude key. It teases
              plays, not people.
            </Text>
          )}
          {review.busy ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <View style={styles.row}>
              <TouchableOpacity style={styles.button} onPress={() => review.roast('short', log)}>
                <Text style={styles.buttonText}>{narration.roast ? 'New short roast' : 'Short roast'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => review.roast('long', log)}>
                <Text style={styles.buttonText}>{narration.roast ? 'New long roast' : 'Long roast'}</Text>
              </TouchableOpacity>
              {narration.roast && (
                <TouchableOpacity onPress={review.deleteRoast} hitSlop={8}>
                  <Text style={styles.link}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {review.error ? <Text style={styles.error}>{review.error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function NarrationCause({
  cause,
  onFlag,
}: {
  cause: NarrationAnnotation | undefined;
  /** Given when the viewer may hide this cause (a player of the match). */
  onFlag?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  if (!cause) return null;

  return (
    <Pressable
      style={styles.cause}
      onLongPress={onFlag ? () => confirmHide(onFlag) : undefined}
      delayLongPress={450}
    >
      <Text style={styles.causeText}>
        ↳ {causeLabel(cause)}
        <Text style={styles.causeConfidence}>{`  ${Math.round(cause.confidence * 100)}%`}</Text>
      </Text>
      {cause.evidence_quote ? <Text style={styles.causeQuote}>“{cause.evidence_quote}”</Text> : null}
    </Pressable>
  );
}

const createStyles = (t: AppTheme) => ({
  section: { gap: spacing[3] },
  title: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  card: {
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  headline: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  body: { color: t.colors.text.primary, fontSize: t.typography.size['body-md'], lineHeight: 22 },
  strong: { fontWeight: t.typography.weight.semibold },
  block: { gap: spacing[1] },
  blockTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  meta: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  link: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: t.colors.border.default,
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  row: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: spacing[3] },
  button: {
    alignSelf: 'flex-start' as const,
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  buttonQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  buttonText: {
    color: t.colors.background.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  buttonTextQuiet: { color: t.colors.text.primary },
  spinner: { alignSelf: 'flex-start' as const, paddingVertical: spacing[2] },
  error: { color: t.colors.lifeTotal.critical, fontSize: t.typography.size.caption },
  cause: { paddingLeft: spacing[4], paddingBottom: spacing[2], gap: 2 },
  causeText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  causeConfidence: { color: t.colors.text.muted, fontWeight: t.typography.weight.regular },
  causeQuote: { color: t.colors.text.muted, fontSize: t.typography.size.caption, fontStyle: 'italic' as const },
});
