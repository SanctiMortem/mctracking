/**
 * SCR-007 — Match Setup
 * Modal full-screen. Player selection + deck assignment → POST /api/matches.
 *
 * MATCH-005 (EPIC-02)
 */
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { MatchSetupForm } from '@/components/match/MatchSetupForm';
import { saveMatchLayout } from '@/services/matchLayout';
import { spacing } from '@/styles/tokens';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppTheme } from '@/styles/themes/types';

export default function MatchSetupScreen() {
  const styles = useThemedStyles(createStyles);

  const { t } = useTranslation();
  function handleSubmit(matchId: string, rotations: Record<string, number>, playerOrder: string[], layoutVariant: string) {
    // Persist first so a close-and-resume flow can recover the layout. Fire-and-forget
    // — SecureStore writes are fast and failures are non-fatal.
    void saveMatchLayout(matchId, { rotations, playerOrder, layoutVariant });
    const rotParam = encodeURIComponent(JSON.stringify(rotations));
    const orderParam = encodeURIComponent(JSON.stringify(playerOrder));
    const layoutParam = encodeURIComponent(layoutVariant);
    router.replace(`/match/${matchId}/tracker?rotations=${rotParam}&playerOrder=${orderParam}&layout=${layoutParam}` as never);
  }

  function handleCancel() {
    router.dismiss();
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          style={styles.closeBtn}
          accessibilityLabel="Cancel match setup"
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{t('match.newMatch')}</Text>
        {/* Spacer keeps title centered */}
        <View style={styles.headerEnd} />
      </View>

      <MatchSetupForm onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}

const createStyles = (t: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border.subtle,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: t.colors.text.secondary,
    fontSize: t.typography.size['body-lg'],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: t.colors.text.primary,
    fontSize: t.typography.size['heading-md'],
    fontWeight: t.typography.weight.semibold,
  },
  headerEnd: {
    width: 36,
  },
})
