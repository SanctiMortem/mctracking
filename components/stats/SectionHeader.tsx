/**
 * SectionHeader — eyebrow + italic-serif title + optional "ALL" link.
 *
 * Used by the redesigned Stats screen for the three big sections
 * (Top Decks / Player Ranking / Top Commanders) and reusable anywhere
 * else that needs the same display language.
 *
 * The eyebrow is the small-caps gold tagline above the title
 * ("THE HALL", "THE STANDINGS", "MOST HONOURED"). When omitted the
 * component still renders the title row.
 */
import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

interface SectionHeaderProps {
  /** Small-caps tagline above the title. */
  eyebrow?: string;
  /** Big italic-serif title. */
  title: string;
  /** When set, renders an "ALL >" link on the right. */
  onAllPress?: () => void;
  allLabel?: string;
}

export function SectionHeader({ eyebrow, title, onAllPress, allLabel = 'ALL' }: SectionHeaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onAllPress && (
          <TouchableOpacity onPress={onAllPress} activeOpacity={0.7} style={styles.allBtn} hitSlop={8}>
            <Text style={styles.allText}>{allLabel}</Text>
            <Feather name="chevron-right" size={16} style={styles.allIcon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  wrap: {
    gap: 2,
  },
  eyebrow: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 2.6,
    textTransform: 'uppercase' as const,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
  },
  title: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-lg'],
    fontFamily: t.typography.fontFamily.displayItalic,
    fontStyle: 'italic' as const,
    fontWeight: t.typography.weight.semibold,
    flexShrink: 1,
    paddingRight: spacing[3],
  },
  allBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingVertical: 4,
    paddingLeft: spacing[2],
  },
  allText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontFamily: t.typography.fontFamily.bodyMedium,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1.8,
  },
  allIcon: {
    color: t.colors.text.muted,
    marginTop: 1,
  },
});
