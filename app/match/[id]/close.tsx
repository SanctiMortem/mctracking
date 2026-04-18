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
import { clearMatchLayout } from '@/services/matchLayout';

export default function MatchCloseScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const isEditMode = edit === 'true';

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
    submitEdit,
  } = useCloseMatch(id);

  async function handleConfirm() {
    if (isEditMode) {
      const ok = await submitEdit();
      if (ok) {
        router.back();
      }
      return;
    }
    const ok = await submit();
    if (ok) {
      // Match is done — drop the persisted layout so it doesn't leak into
      // future matches and takes no space in SecureStore.
      void clearMatchLayout(id);
      // Dismiss all modals (tracker + close sheet) before navigating
      router.dismissAll();
      if (mode === 'abandon') {
        router.replace('/(tabs)/' as never);
      } else {
        router.replace(`/match/${id}/results` as never);
      }
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
        hideAbandon={isEditMode}
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
