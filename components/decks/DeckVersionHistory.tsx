/**
 * DeckVersionHistory — the dated history of a deck's list, newest first.
 *
 * Each version shows when it was uploaded and by whom, the deck's record
 * while it was current, and — on tap — the cards added, removed or changed
 * since the previous version. Matches with no recorded version (played
 * before versioning existed) are shown as their own row at the bottom.
 * Card names are always shown in English.
 *
 * DECK-007 (EPIC-07)
 */
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useDeckVersions } from '@/hooks/useDeckVersions';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { DeckVersionSummary } from '@/services/decklists';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export function DeckVersionHistory({ deckId }: { deckId: string }) {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { data, loading, error } = useDeckVersions(deckId, true);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <ActivityIndicator style={styles.loading} />;
  if (error || !data) return <Text style={styles.meta}>{t('decklist.history.loadFailed')}</Text>;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  const record = (matches: number, wins: number) =>
    matches === 0
      ? t('decklist.history.noMatches')
      : `${t('decklist.history.matches', { count: matches })} · ${t('decklist.history.wins', { count: wins })}`;

  const renderVersion = (v: DeckVersionSummary, isCurrent: boolean) => {
    const changes = v.diff ? v.diff.added.length + v.diff.removed.length + v.diff.changed.length : 0;
    const open = openId === v.id;
    return (
      <View key={v.id} style={styles.version}>
        <TouchableOpacity
          activeOpacity={changes > 0 ? 0.7 : 1}
          onPress={() => changes > 0 && setOpenId(open ? null : v.id)}
        >
          <View style={styles.versionHead}>
            <Text style={styles.versionTitle}>
              {t('decklist.history.version', { number: v.number })}
              {isCurrent ? <Text style={styles.current}>{`  ${t('decklist.history.current')}`}</Text> : null}
            </Text>
            <Text style={styles.meta}>{formatDate(v.created_at)}</Text>
          </View>
          <Text style={styles.meta}>
            {[
              v.total_cards === 0
                ? t('decklist.history.listRemoved')
                : t('decklist.cardsCount', { count: v.total_cards }),
              v.uploaded_by ? t('decklist.history.uploadedBy', { name: v.uploaded_by }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.meta}>{record(v.matches, v.wins)}</Text>
          {v.diff && changes > 0 ? (
            <View style={styles.diffSummary}>
              {v.diff.added.length > 0 && <Text style={styles.added}>+{v.diff.added.length}</Text>}
              {v.diff.removed.length > 0 && <Text style={styles.removed}>−{v.diff.removed.length}</Text>}
              {v.diff.changed.length > 0 && <Text style={styles.changed}>~{v.diff.changed.length}</Text>}
              <Text style={styles.linkText}>{open ? t('decklist.hide') : t('decklist.history.seeChanges')}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {open && v.diff ? (
          <View style={styles.diff}>
            {v.diff.added.map((c) => (
              <Text key={`a-${c.name}`} style={styles.added} numberOfLines={1}>
                + {c.quantity > 1 ? `${c.quantity} ` : ''}{c.name}
              </Text>
            ))}
            {v.diff.removed.map((c) => (
              <Text key={`r-${c.name}`} style={styles.removed} numberOfLines={1}>
                − {c.quantity > 1 ? `${c.quantity} ` : ''}{c.name}
              </Text>
            ))}
            {v.diff.changed.map((c) => (
              <Text key={`c-${c.name}`} style={styles.changed} numberOfLines={1}>
                ~ {c.name}  {c.from} → {c.to}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.list}>
      {data.versions.map((v, i) => renderVersion(v, i === 0))}
      {data.unknown_version.matches > 0 ? (
        <View style={styles.version}>
          <Text style={styles.versionTitle}>{t('decklist.history.unknownVersion')}</Text>
          <Text style={styles.meta}>{t('decklist.history.unknownVersionHint')}</Text>
          <Text style={styles.meta}>
            {record(data.unknown_version.matches, data.unknown_version.wins)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (t: AppTheme) => ({
  loading: { paddingVertical: spacing[3] },
  list: { gap: spacing[3] },
  version: {
    gap: 2,
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: t.colors.border.default,
  },
  versionHead: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[2],
  },
  versionTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  current: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
  meta: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  diffSummary: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    marginTop: 4,
  },
  diff: { gap: 3, marginTop: spacing[2] },
  added: { color: t.colors.status.success, fontSize: t.typography.size['body-sm'] },
  removed: { color: t.colors.status.error, fontSize: t.typography.size['body-sm'] },
  changed: { color: t.colors.status.warning, fontSize: t.typography.size['body-sm'] },
  linkText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    marginLeft: 'auto' as const,
  },
});
