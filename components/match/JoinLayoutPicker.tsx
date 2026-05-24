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
}

function defaultRotationsForCount(variant: string): number[] {
  return [...(DEFAULT_SLOT_ROTATIONS[variant] ?? [])];
}

export function JoinLayoutPicker({ players, onConfirm }: JoinLayoutPickerProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const count = players.length;

  const initialVariant = LAYOUT_VARIANTS[count]?.[0] ?? '';
  const [layoutVariant, setLayoutVariant] = useState<string>(initialVariant);

  // Seat order is just a permutation of the incoming players. We track it
  // by playerId (not by a fresh slot id) so the LayoutPreview can drag-and-
  // drop tiles labelled with the real player names.
  const [orderedPlayers, setOrderedPlayers] = useState<JoinLayoutPickerPlayer[]>(() => [...players]);

  // Rotation is keyed by slot index, mapped onto whichever player currently
  // sits in that slot. Start from the layout's default rotation list.
  const [slotRotations, setSlotRotations] = useState<number[]>(() => defaultRotationsForCount(initialVariant));

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
      // Reorder the underlying players array AND move each rotation with its
      // tile so the seat orientation stays attached to the player, not the
      // slot — what you see is what you persist.
      setOrderedPlayers((prev) => {
        const byId = new Map(prev.map((p) => [p.playerId, p]));
        return reordered.map((r) => byId.get(r.id)).filter((p): p is JoinLayoutPickerPlayer => p !== undefined);
      });
      setSlotRotations((prev) => {
        const next = [...prev];
        reordered.forEach((tile, newIdx) => {
          const oldIdx = previewTiles.findIndex((p) => p.id === tile.id);
          if (oldIdx >= 0) next[newIdx] = prev[oldIdx] ?? 0;
        });
        return next;
      });
    },
    [previewTiles],
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
        <Pressable
          onPress={handleStart}
          style={styles.startBtn}
          accessibilityRole="button"
          accessibilityLabel={t('joinLayout.startLabel')}
        >
          <Text style={styles.startBtnText}>{t('joinLayout.startBtn')}</Text>
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
    backgroundColor: t.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  startBtn: {
    backgroundColor: t.colors.accent.primary,
    borderRadius: t.radius.xl,
    height: 52,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  startBtnText: {
    color: t.colors.accent.onPrimary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.5,
  },
});
