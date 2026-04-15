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
import { colors, spacing, typography } from '@/styles/tokens';

export default function MatchSetupScreen() {
  const { t } = useTranslation();
  function handleSubmit(matchId: string, rotations: Record<string, number>, playerOrder: string[], layoutVariant: string) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontSize: typography.size['body-lg'],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: typography.size['heading-md'],
    fontWeight: typography.weight.semibold,
  },
  headerEnd: {
    width: 36,
  },
});
