/**
 * CommanderCardModal — read a deck's commander like any card in its list:
 * the card image, its type line and its rules text.
 *
 * The card is loaded the first time a commander is opened (GET
 * /api/decks/:id/commander-cards) and kept for as long as the deck screen is
 * open. If it cannot be loaded the modal still shows the name with a short
 * message, never an empty box.
 *
 * Same look as the card detail in DecklistSection. Card names and rules text
 * are always in English.
 */
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@clerk/clerk-expo';

import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { apiFetch } from '@/services/api';
import type { CommanderCardView } from '@/services/decklists';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

type CardsResponse = { success: true; data: { commanders: CommanderCardView[] } };

export interface CommanderCardViewer {
  /** Open the modal on this commander, loading the cards if needed. */
  open: (commanderId: string, name: string) => void;
  /** Render once, anywhere in the screen. */
  modal: React.ReactNode;
}

export function useCommanderCardViewer(deckId: string): CommanderCardViewer {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Clerk's getToken identity is unstable — hold it in a ref, never in deps.
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [cards, setCards] = useState<CommanderCardView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef(false);

  const open = useCallback(
    (commanderId: string, name: string) => {
      setSelected({ id: commanderId, name });
      if (requestedRef.current) return;
      requestedRef.current = true;
      setLoading(true);
      (async () => {
        try {
          const token = await getTokenRef.current();
          const res = await apiFetch<CardsResponse>(
            `/api/decks/${deckId}/commander-cards`,
            'GET',
            undefined,
            token ?? undefined,
          );
          setCards(Array.isArray(res?.data?.commanders) ? res.data.commanders : []);
        } catch {
          // Let the next tap try again.
          requestedRef.current = false;
          setCards(null);
        } finally {
          setLoading(false);
        }
      })();
    },
    [deckId],
  );

  const close = useCallback(() => setSelected(null), []);
  const card = selected ? (cards?.find((c) => c.commander_id === selected.id)?.card ?? null) : null;

  const modal = (
    <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.content}>
            {card?.image_url ? (
              <Image source={{ uri: card.image_url }} style={styles.image} resizeMode="contain" />
            ) : null}
            <Text style={styles.name}>{card?.name ?? selected?.name}</Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.accent.primary} style={styles.spinner} />
            ) : card ? (
              <>
                {card.type_line ? <Text style={styles.type}>{card.type_line}</Text> : null}
                {card.oracle_text ? <Text style={styles.oracle}>{card.oracle_text}</Text> : null}
              </>
            ) : (
              <Text style={styles.type}>{t('commanderCard.unavailable')}</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={close}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { open, modal };
}

const createStyles = (t: AppTheme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing[4],
  },
  sheet: {
    width: '100%' as const,
    maxWidth: 380,
    maxHeight: '90%' as const,
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border.default,
    padding: spacing[4],
    gap: spacing[2],
  },
  content: { gap: spacing[2], alignItems: 'center' as const },
  image: { width: '100%' as const, aspectRatio: 488 / 680, borderRadius: 12 },
  spinner: { paddingVertical: spacing[4] },
  name: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
    textAlign: 'center' as const,
  },
  type: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    textAlign: 'center' as const,
  },
  oracle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-sm'],
    lineHeight: 20,
    alignSelf: 'stretch' as const,
  },
  closeBtn: {
    minHeight: 40,
    paddingHorizontal: spacing[2],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  closeText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
});
