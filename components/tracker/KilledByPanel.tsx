/**
 * KilledByPanel — LABS. Shown inside a dead player's frame: who killed them?
 *
 * One button per opposing commander (commander name, player name under it;
 * a partner deck gets one button per commander), then a visually different
 * "Self-inflicted" button. Tap selects, tapping another switches, tapping
 * the selected one clears. There is no confirm and nothing is required: if
 * nobody taps, the panel just sits there.
 *
 * It fills the frame's main zone, in the place the commander-damage picker
 * uses, and is laid out the same way: a title over a scrolling list. The
 * list is one column in a narrow frame and two in a wide one, so a
 * four-player table usually needs no scrolling.
 *
 * LEGIBILITY  PlayerDashboard dims a dead frame, but not this panel: it
 * renders at full strength, and every button has a solid background, so the
 * labels read the same over bright commander art (the "New player frames"
 * experiment), faint art or no art at all, in either theme.
 *
 * Like every control in a frame it lives inside the rotated content, so it
 * faces the dead player, and uses GHPressable so a tap here never waits on
 * (or steals) another player's touch.
 *
 * Which options are offered is decided by `killerOptionsForDeath` in
 * services/killedBy.ts.
 */
import { useCallback, useState } from 'react';
import { type LayoutChangeEvent, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GHPressable } from '@/components/ui/GHPressable';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  SELF_INFLICTED,
  isOptionSelected,
  selectionForOption,
  toggleKillerSelection,
  type KillerOption,
  type KillerSelection,
} from '@/services/killedBy';
import type { AppTheme } from '@/styles/themes/types';

/** Two columns once each button would still be this wide. */
const MIN_TWO_COLUMN_BUTTON_WIDTH = 104;
const GAP = 5;
/** Below this panel height the title and buttons tighten up. */
const COMPACT_HEIGHT = 130;

interface KilledByPanelProps {
  /** Opposing commanders to offer, in seat order. */
  options: readonly KillerOption[];
  /** The dead player's current selection, if any. */
  selection: KillerSelection | null | undefined;
  /** Called with the selection after the tap (NO_KILLER when it clears). */
  onSelect: (next: KillerSelection) => void;
}

export function KilledByPanel({ options, selection, onSelect }: KilledByPanelProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) =>
      Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height },
    );
  }, []);

  const tap = useCallback(
    (tapped: KillerSelection) => onSelect(toggleKillerSelection(selection, tapped)),
    [onSelect, selection],
  );

  const compact = box.h > 0 && box.h < COMPACT_HEIGHT;
  const twoColumns = box.w >= MIN_TWO_COLUMN_BUTTON_WIDTH * 2 + GAP;
  // Two buttons plus the gap must never add up to a hair more than the row,
  // or the second one wraps and the grid collapses into a single column. The
  // measured width can be rounded UP by a fraction of a pixel (seen on web:
  // 290.5 reported as 291), hence whole pixels, rounded down, minus one.
  const columnWidth: number | '100%' = twoColumns ? Math.floor((box.w - GAP - 1) / 2) : '100%';
  const selfSelected = selection?.deathCause === 'self';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
        {t('tracker.killedBy', { defaultValue: 'Killed by' })}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onLayout={onLayout}
      >
        {/* Nothing is drawn until the width is known, so the buttons never
            jump from one column to two. */}
        {box.w > 0 && (
          <>
            {options.map((option) => {
              const selected = isOptionSelected(selection, option);
              return (
                <GHPressable
                  key={option.key}
                  onPress={() => tap(selectionForOption(option))}
                  style={[
                    styles.option,
                    compact && styles.optionCompact,
                    { width: columnWidth },
                    selected && styles.optionSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.commanderName}, ${option.playerName}`}
                >
                  <Text
                    style={[styles.commanderName, selected && styles.textSelected]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {option.commanderName}
                  </Text>
                  <Text style={[styles.playerName, selected && styles.playerNameSelected]} numberOfLines={1}>
                    {option.playerName}
                  </Text>
                </GHPressable>
              );
            })}

            <GHPressable
              onPress={() => tap(SELF_INFLICTED)}
              style={[
                styles.option,
                styles.selfOption,
                compact && styles.optionCompact,
                styles.fullWidth,
                selfSelected && styles.optionSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('tracker.selfInflicted', { defaultValue: 'Self-inflicted' })}
            >
              <Text style={[styles.selfText, selfSelected && styles.textSelected]} numberOfLines={1}>
                {t('tracker.selfInflicted', { defaultValue: 'Self-inflicted' })}
              </Text>
            </GHPressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  container: {
    flex: 1,
    width: '100%' as const,
    minHeight: 0,
    gap: 4,
  },
  title: {
    color: t.colors.accent.primaryAlt,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  titleCompact: {
    fontSize: t.typography.size.label,
  },
  list: {
    flex: 1,
    width: '100%' as const,
  },
  listContent: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    columnGap: GAP,
    rowGap: GAP,
  },

  // One border width in both states, so selecting never shifts the layout.
  option: {
    minHeight: 40,
    justifyContent: 'center' as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.colors.border.strong,
    backgroundColor: t.colors.background.elevated,
  },
  optionCompact: {
    minHeight: 34,
    paddingVertical: 2,
  },
  // Selected = a solid accent button with dark text: the strongest contrast
  // the theme has, so the choice is readable at a glance from across the
  // table and cannot be mistaken for an unselected button.
  optionSelected: {
    borderStyle: 'solid' as const,
    borderColor: t.colors.accent.primary,
    backgroundColor: t.colors.accent.primary,
  },
  commanderName: {
    color: t.colors.text.primary,
    fontFamily: t.typography.fontFamily.headline,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center' as const,
  },
  playerName: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.label - 1,
    textAlign: 'center' as const,
  },
  textSelected: {
    color: t.colors.accent.onPrimary,
    fontWeight: t.typography.weight.bold,
  },
  playerNameSelected: {
    color: t.colors.accent.onPrimary,
  },

  fullWidth: {
    width: '100%' as const,
  },

  // "Self-inflicted": not a commander, so it does not look like one — a
  // dashed outline on the frame's own background, full width, one line.
  selfOption: {
    minHeight: 34,
    borderStyle: 'dashed' as const,
    borderColor: t.colors.text.secondary,
    backgroundColor: t.colors.background.secondary,
  },
  selfText: {
    color: t.colors.text.secondary,
    fontFamily: t.typography.fontFamily.body,
    fontSize: t.typography.size.caption,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
});
