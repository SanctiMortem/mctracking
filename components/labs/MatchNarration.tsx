/**
 * LABS — AI match narration on the match detail screen.
 *
 * `useNarration` loads the recap and per-event causes, but only when the
 * Labs switch is on for this device, so nobody else's app makes the call.
 * `NarrationRecap` renders the recap card; `NarrationCause` renders the
 * one-line cause under a log entry.
 *
 * English only and self-contained: delete components/labs to remove it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@clerk/clerk-expo';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { apiFetch } from '@/services/api';
import { isLabsEnabled } from '@/services/labs/aiKeys';
import type { Narration, NarrationAnnotation } from '@/services/narration';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export type NarrationState = {
  narration: Narration | null;
  /** event id → cause, for quick lookup while rendering the log. */
  causes: Map<string, NarrationAnnotation>;
};

const EMPTY: NarrationState = { narration: null, causes: new Map() };

export function useNarration(matchId: string | undefined): NarrationState {
  const { getToken } = useAuth();
  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [narration, setNarration] = useState<Narration | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await isLabsEnabled())) return;
        const token = await getTokenRef.current();
        const res = await apiFetch<{ success: true; data: Narration | null }>(
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

  return useMemo(
    () =>
      narration
        ? { narration, causes: new Map(narration.annotations.map((a) => [a.event_id, a])) }
        : EMPTY,
    [narration],
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

export function NarrationRecap({ narration }: { narration: Narration | null }) {
  const styles = useThemedStyles(createStyles);
  const [showSpeakers, setShowSpeakers] = useState(false);
  if (!narration) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        AI recap{narration.status === 'draft' ? '  ·  draft' : ''}
      </Text>
      <View style={styles.card}>
        <Text style={styles.headline}>{narration.headline}</Text>
        <Text style={styles.body}>{narration.narrative}</Text>

        {narration.key_moments.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Key moments</Text>
            {narration.key_moments.map((m, i) => (
              <Text key={i} style={styles.body}>• {m}</Text>
            ))}
          </View>
        )}

        {narration.rules_debates.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Rules debates</Text>
            {narration.rules_debates.map((d, i) => (
              <Text key={i} style={styles.body}>
                <Text style={styles.strong}>{d.question}</Text> — {d.outcome}
              </Text>
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
      </View>
    </View>
  );
}

export function NarrationCause({ cause }: { cause: NarrationAnnotation | undefined }) {
  const styles = useThemedStyles(createStyles);
  if (!cause) return null;

  const parts = [cause.source_player, cause.source_card, DAMAGE_LABELS[cause.damage_type] ?? cause.damage_type]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.cause}>
      <Text style={styles.causeText}>
        ↳ {parts}
        <Text style={styles.causeConfidence}>{`  ${Math.round(cause.confidence * 100)}%`}</Text>
      </Text>
      {cause.evidence_quote ? <Text style={styles.causeQuote}>“{cause.evidence_quote}”</Text> : null}
    </View>
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
  cause: { paddingLeft: spacing[4], paddingBottom: spacing[2], gap: 2 },
  causeText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  causeConfidence: { color: t.colors.text.muted, fontWeight: t.typography.weight.regular },
  causeQuote: { color: t.colors.text.muted, fontSize: t.typography.size.caption, fontStyle: 'italic' as const },
});
