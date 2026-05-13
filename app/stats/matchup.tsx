/**
 * SCR-015 — Matchup Stats.
 *
 * Lets the user pick:
 *   - Entity type: Jugador / Deck / Comandante
 *   - Entity A and Entity B (via EntitySelector)
 *   - Scope: Todos / Solo 1v1
 *
 * Shows MatchupCard with live head-to-head result.
 *
 * HIST-011 (EPIC-04)
 */
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EntitySelector } from '@/components/stats/EntitySelector';
import { MatchupCard } from '@/components/stats/MatchupCard';
import { useGroups } from '@/hooks/useGroups';
import { useMatchupOptions } from '@/hooks/useMatchupOptions';
import { useMatchupStats } from '@/hooks/useMatchupStats';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

type EntityType = 'player' | 'deck' | 'commander';
type Scope = 'all' | '1v1';

// ─── Segmented control ────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const segStyles = useThemedStyles(createSegStyles);

  return (
    <View style={segStyles.container}>
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[segStyles.tab, isActive && segStyles.tabActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[segStyles.tabText, isActive && segStyles.tabTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createSegStyles = (theme: AppTheme) => ({
  container: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.radius.md,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center' as const,
    borderRadius: theme.radius.sm,
  },
  tabActive: { backgroundColor: theme.colors.background.elevated },
  tabText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.size['body-sm'],
    fontWeight: theme.typography.weight.medium,
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.weight.semibold,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MatchupStatsScreen() {
  const styles = useThemedStyles(createStyles);

  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState<EntityType>('player');
  const [entityAId, setEntityAId] = useState<string | null>(null);
  const [entityBId, setEntityBId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [scopeGroupId, setScopeGroupId] = useState<string | null>(null);

  const { groups } = useGroups();
  const { data: optionsData } = useMatchupOptions(scopeGroupId);
  const { players, decks, commanders } = optionsData;

  const scopeOptions: Array<{ id: string | null; label: string }> = [
    { id: null, label: t('stats.scopePersonal') },
    ...groups.map((g) => ({ id: g.group.id, label: g.group.name })),
  ];

  const ENTITY_TYPE_TABS: { key: EntityType; label: string }[] = [
    { key: 'player', label: t('stats.entityPlayer') },
    { key: 'deck', label: t('stats.entityDeck') },
    { key: 'commander', label: t('stats.entityCommander') },
  ];

  const SCOPE_TABS: { key: Scope; label: string }[] = [
    { key: 'all', label: t('stats.scopeAll') },
    { key: '1v1', label: t('stats.scope1v1') },
  ];

  // Reset selections when entity type changes
  function handleEntityTypeChange(type: EntityType) {
    setEntityType(type);
    setEntityAId(null);
    setEntityBId(null);
  }

  // Reset selections when the scope changes — entity IDs may not exist in the
  // new scope, so the picker would render a stale "selected" state.
  function handleScopeChange(id: string | null) {
    setScopeGroupId(id);
    setEntityAId(null);
    setEntityBId(null);
  }

  // Build entity options for the selector
  function buildOptions(): { id: string; label: string }[] {
    if (entityType === 'player') {
      return players.map((p) => ({ id: p.id, label: p.name }));
    }
    if (entityType === 'deck') {
      return decks.map((d) => ({ id: d.id, label: d.name }));
    }
    return commanders.map((c) => ({ id: c.id, label: c.name }));
  }

  const options = buildOptions();

  // Name lookups for MatchupCard display
  const entityAName = entityAId ? (options.find((o) => o.id === entityAId)?.label ?? null) : null;
  const entityBName = entityBId ? (options.find((o) => o.id === entityBId)?.label ?? null) : null;

  const { data: matchupData, loading: matchupLoading } = useMatchupStats(
    entityType,
    entityAId,
    entityBId,
    scope,
    scopeGroupId,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Scope picker — Personal / each pod */}
        {scopeOptions.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>{t('stats.scopeLabel')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scopeRow}
            >
              {scopeOptions.map((opt) => {
                const selected = opt.id === scopeGroupId;
                return (
                  <TouchableOpacity
                    key={opt.id ?? 'personal'}
                    style={[styles.scopeChip, selected && styles.scopeChipActive]}
                    onPress={() => handleScopeChange(opt.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.scopeChipText, selected && styles.scopeChipTextActive]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Entity type selector */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('stats.entityType')}</Text>
          <SegmentedControl
            options={ENTITY_TYPE_TABS}
            value={entityType}
            onChange={handleEntityTypeChange}
          />
        </View>

        {/* Entity A selector */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('stats.entityA')}</Text>
          <EntitySelector
            entities={options}
            selected={entityAId}
            onSelect={setEntityAId}
            placeholder={t('stats.noOptions')}
            searchPlaceholder={t('stats.searchPlaceholder')}
          />
        </View>

        {/* Entity B selector */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('stats.entityB')}</Text>
          <EntitySelector
            entities={options.filter((o) => o.id !== entityAId)}
            selected={entityBId}
            onSelect={setEntityBId}
            placeholder={t('stats.noOptions')}
            searchPlaceholder={t('stats.searchPlaceholder')}
          />
        </View>

        {/* Scope toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('stats.matchesToInclude')}</Text>
          <SegmentedControl
            options={SCOPE_TABS}
            value={scope}
            onChange={setScope}
          />
        </View>

        {/* Result card */}
        <MatchupCard
          entityAName={entityAName}
          entityBName={entityBName}
          data={matchupData}
          loading={matchupLoading}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  section: { gap: spacing[2] },
  label: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  scopeRow: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  scopeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: t.radius.round,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    backgroundColor: t.colors.background.surface,
  },
  scopeChipActive: {
    backgroundColor: t.colors.accent.primary + '22',
    borderColor: t.colors.accent.primary + '99',
  },
  scopeChipText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size.caption,
    fontWeight: t.typography.weight.semibold,
  },
  scopeChipTextActive: {
    color: t.colors.accent.primary,
  },
})
