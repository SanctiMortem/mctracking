/**
 * SCR-009 — Cierre de Match
 * Transparent modal rendered over SCR-008 → bottom sheet appearance.
 *
 * MATCH-006 (EPIC-02)
 */
import { StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { CloseMatchSheet } from '@/components/match/CloseMatchSheet';
import { useCloseMatch } from '@/hooks/useCloseMatch';

export default function MatchCloseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    participations,
    loadingMatch,
    mode,
    setMode,
    selectedWinnerId,
    setSelectedWinnerId,
    selectedWinCondition,
    setSelectedWinCondition,
    isValid,
    isSubmitting,
    error,
    submit,
  } = useCloseMatch(id);

  async function handleConfirm() {
    const ok = await submit();
    if (ok) {
      router.replace(`/match/${id}/results` as never);
    }
  }

  function handleCancel() {
    router.back();
  }

  return (
    <View style={styles.overlay}>
      <CloseMatchSheet
        participations={participations}
        loading={loadingMatch}
        mode={mode}
        onModeChange={setMode}
        selectedWinnerId={selectedWinnerId}
        onSelectWinner={setSelectedWinnerId}
        selectedWinCondition={selectedWinCondition}
        onSelectWinCondition={setSelectedWinCondition}
        isValid={isValid}
        isSubmitting={isSubmitting}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
