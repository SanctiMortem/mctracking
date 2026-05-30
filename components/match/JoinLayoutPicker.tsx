/**
 * JoinLayoutPicker — shown by the match tracker when a device opens an
 * in-progress match WITHOUT any layout info (no URL params from setup AND
 * no SecureStore entry — i.e. a different pod member's device tapped the
 * "Match in progress" banner on Home).
 *
 * Lets that joining device pick its own seat order + rotations + layout
 * variant before entering the tracker. The choice is persisted via the
 * existing saveMatchLayout helper (SecureStore, per-match key), so a
 * later reload on the same device skips the picker.
 *
 * No backend changes — this is per-device state.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LayoutPreview } from '@/components/match/LayoutPreview';
import { DEFAULT_SLOT_ROTATIONS, LAYOUT_VARIANTS } from '@/hooks/useMatchSetup';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

export interface JoinLayoutPickerPlayer {
  /** The players.id for this seat — used as the key in the rotations map
   *  and seat-order array (matches the tracker's playerOrder convention). */
  playerId: string;
  /** Display name for the preview tile. */
  name: string;
}

export interface JoinLayoutPickerResult {
  layoutVariant: string;
  rotations: Record<string, number>; // playerId → degrees
  playerOrder: string[];             // playerIds in seat order
}

interface JoinLayoutPickerProps {
  /** Match's participations resolved to playerId + display name. */
  players: JoinLayoutPickerPlayer[];
  onConfirm: (result: JoinLayoutPickerResult) => void;
  /**
   * Pre-fill the picker with the device's current layout instead of starting
   * from the defaults. Used by the mid-match "Adjust layout" button so the
   * user lands on their existing config and can tweak it. When omitted the
   * picker starts fresh (default behaviour for the join-from-another-device
   * first-load case).
   */
  initialLayoutVariant?: string;
  initialRotations?: Record<string, number>;
  initialPlayerOrder?: string[];
  /** Optional copy override for the primary action — defaults to "Start". */
  confirmLabel?: string;
  /** Optional secondary action (Cancel). When set, renders a Cancel button. */
  onCancel?: () => void;
}

function defaultRotationsForCount(variant: string): number[] {
  return [...(DEFAULT_SLOT_ROTATIONS[variant] ?? [])];
}

export function JoinLayoutPicker({
  players,
  onConfirm,
  initialLayoutVariant,
  initialRotations,
  initialPlayerOrder,
  confirmLabel,
  onCancel,
}: JoinLayoutPickerProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const count = players.length;

  // Resolve the variant + ordering + rotations either from the explicit
  // initial-state props (mid-match edit) or from defaults (first join).
  const initialVariant = initialLayoutVariant ?? LAYOUT_VARIANTS[count]?.[0] ?? '';
  const [layoutVariant, setLayoutVariant] = useState<string>(initialVariant);

  // Seat order is just a permutation of the incoming players. We track it
  // by playerId (not by a fresh slot id) so the LayoutPreview can drag-and-
  // drop tiles labelled with the real player names.
  const [orderedPlayers, setOrderedPlayers] = useState<JoinLayoutPickerPlayer[]>(() => {
    if (!initialPlayerOrder || initialPlayerOrder.length === 0) return [...players];
    const byId = new Map(players.map((p) => [p.playerId, p]));
    const ordered = initialPlayerOrder
      .map((pid) => byId.get(pid))
      .filter((p): p is JoinLayoutPickerPlayer => p !== undefined);
    // Append any players missing from initialPlayerOrder so the picker
    // never silently drops a seat (defensive — shouldn't happen in practice).
    const seen = new Set(ordered.map((p) => p.playerId));
    for (const p of players) if (!seen.has(p.playerId)) ordered.push(p);
    return ordered;
  });

  // Rotation is keyed by slot index, mapped onto whichever player currently
  // sits in that slot. Pre-fill from initialRotations (looked up by the
  // player sitting in that slot) when provided; otherwise use defaults.
  const [slotRotations, setSlotRotations] = useState<number[]>(() => {
    if (initialRotations) {
      const ordered = initialPlayerOrder && initialPlayerOrder.length > 0
        ? initialPlayerOrder
        : players.map((p) => p.playerId);
      return ordered.map((pid) => initialRotations[pid] ?? 0);
    }
    return defaultRotationsForCount(initialVariant);
  });

  // LayoutPreview wants tiles with id + name. We use the player's id as the
  // tile id so reorder events flow back cleanly.
  const previewTiles = useMemo(
    () => orderedPlayers.map((p) => ({ id: p.playerId, name: p.name })),
    [orderedPlayers],
  );

  const rotationsById = useMemo(() => {
    const map: Record<string, number> = {};
    previewTiles.forEach((tile, i) => {
      map[tile.id] = slotRotations[i] ?? 0;
    });
    return map;
  }, [previewTiles, slotRotations]);

  const handleLayoutChange = useCallback((variant: string) => {
    setLayoutVariant(variant);
    setSlotRotations(defaultRotationsForCount(variant));
  }, []);

  const handleRotate = useCallback((playerId: string, degrees: number) => {
    setSlotRotations((prev) => {
      const idx = previewTiles.findIndex((p) => p.id === playerId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = degrees;
      return next;
    });
  }, [previewTiles]);

  const handleReorder = useCallback(
    (reordered: { id: string; name: string }[]) => {
      // Rotation belongs to the slot (frame), NOT to the player — same
      // rule as useMatchSetup.reorderPlayers. We only reorder the player
      // array; slotRotations stays untouched. Since rotation is indexed
      // by slot position, the seat orientation is pinned where it is and
      // whichever player ends up in that slot adopts that orientation.
      setOrderedPlayers((prev) => {
        const byId = new Map(prev.map((p) => [p.playerId, p]));
        return reordered.map((r) => byId.get(r.id)).filter((p): p is JoinLayoutPickerPlayer => p !== undefined);
      });
    },
    [],
  );

  function handleStart() {
    onConfirm({
      layoutVariant,
      rotations: rotationsById,
      playerOrder: orderedPlayers.map((p) => p.playerId),
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <Text style={styles.title}>{t('joinLayout.title')}</Text>
        <Text style={styles.subtitle}>{t('joinLayout.subtitle')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{t('joinLayout.layoutLabel')}</Text>
        <LayoutPreview
          players={previewTiles}
          rotations={rotationsById}
          layoutVariant={layoutVariant}
          onReorder={handleReorder}
          onRotate={handleRotate}
          onLayoutChange={handleLayoutChange}
        />

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        {onCancel && (
          <Pressable
            onPress={onCancel}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleStart}
          style={[styles.startBtn, onCancel && styles.startBtnInline]}
          accessibilityRole="button"
          accessibilityLabel={t('joinLayout.startLabel')}
        >
          <Text style={styles.startBtnText}>{confirmLabel ?? t('joinLayout.startBtn')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const FOOTER_HEIGHT = 88;

const createStyles = (t: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
    gap: 2,
  },
  title: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  subtitle: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  sectionLabel: {
    color: t.colors.text.tertiary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: spacing[3],
  },
  spacer: { height: FOOTER_HEIGHT + spacing[4] },
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
    backgroundColor: t.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  startBtn: {
    flex: 1,
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.xl,
    height: 52,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Kept as an explicit no-op style so existing call sites that read the
  // `startBtnInline` selector don't break — startBtn already has flex:1.
  startBtnInline: {},
  startBtnText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: t.radius.xl,
    height: 52,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
  },
  cancelBtnText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
});
