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
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntitySelector } from '@/components/stats/EntitySelector';
import { MatchupCard } from '@/components/stats/MatchupCard';
import { useCommanders } from '@/hooks/useCommanders';
import { useDecks } from '@/hooks/useDecks';
import { useMatchupStats } from '@/hooks/useMatchupStats';
import { usePlayers } from '@/hooks/usePlayers';
import type { Commander, Deck, Player } from '@/db/index';
import { colors, radius, spacing, typography } from '@/styles/tokens';

type EntityType = 'player' | 'deck' | 'commander';
type Scope = 'all' | '1v1';

const ENTITY_TYPE_TABS: { key: EntityType; label: string }[] = [
  { key: 'player', label: 'Jugador' },
  { key: 'deck', label: 'Deck' },
  { key: 'commander', label: 'Comandante' },
];

const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: '1v1', label: 'Solo 1v1' },
];

// ─── Segmented control ────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}

function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
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

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.background.elevated },
  tabText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.medium,
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MatchupStatsScreen() {
  const insets = useSafeAreaInsets();
  const [entityType, setEntityType] = useState<EntityType>('player');
  const [entityAId, setEntityAId] = useState<string | null>(null);
  const [entityBId, setEntityBId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('all');

  const { players } = usePlayers();
  const { decks } = useDecks();
  const { commanders } = useCommanders();

  // Reset selections when entity type changes
  function handleEntityTypeChange(type: EntityType) {
    setEntityType(type);
    setEntityAId(null);
    setEntityBId(null);
  }

  // Build entity options for the selector
  function buildOptions(): { id: string; label: string }[] {
    if (entityType === 'player') {
      return (players as Player[]).map((p) => ({ id: p.id, label: p.name }));
    }
    if (entityType === 'deck') {
      return (decks as Deck[]).map((d) => ({ id: d.id, label: d.name }));
    }
    return (commanders as Commander[]).map((c) => ({ id: c.id, label: c.name }));
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
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Entity type selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de entidad</Text>
          <SegmentedControl
            options={ENTITY_TYPE_TABS}
            value={entityType}
            onChange={handleEntityTypeChange}
          />
        </View>

        {/* Entity A selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Entidad A</Text>
          <EntitySelector
            entities={options}
            selected={entityAId}
            onSelect={setEntityAId}
            placeholder="Sin opciones disponibles"
            searchPlaceholder="Buscar entidad A…"
          />
        </View>

        {/* Entity B selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Entidad B</Text>
          <EntitySelector
            entities={options.filter((o) => o.id !== entityAId)}
            selected={entityBId}
            onSelect={setEntityBId}
            placeholder="Sin opciones disponibles"
            searchPlaceholder="Buscar entidad B…"
          />
        </View>

        {/* Scope toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Partidas a incluir</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  section: { gap: spacing[2] },
  label: {
    color: colors.text.secondary,
    fontSize: typography.size['body-sm'],
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
