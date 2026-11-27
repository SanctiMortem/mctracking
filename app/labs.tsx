/**
 * LABS — hidden screen for experimental AI match narration (KEY-001).
 *
 * Reached by long-pressing the version line on the About screen. English
 * only and deliberately self-contained: delete this file and services/labs
 * to remove the whole experiment.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  type AiProvider,
  KEY_CONSOLE_URLS,
  getAiKey,
  isFrameExperimentEnabled,
  isLabsEnabled,
  maskKey,
  removeAiKey,
  saveAiKey,
  setFrameExperimentEnabled,
  setLabsEnabled,
  testAiKey,
} from '@/services/labs/aiKeys';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

type Status =
  | { kind: 'none' }
  | { kind: 'saved'; masked: string }
  | { kind: 'connected'; masked: string }
  | { kind: 'error'; masked: string | null; message: string };

const PROVIDERS: { id: AiProvider; name: string; blurb: string; placeholder: string }[] = [
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    blurb: 'Explains the match log and writes the recap.',
    placeholder: 'sk-ant-…',
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    blurb: 'Turns the table recording into text.',
    placeholder: 'Deepgram API key',
  },
];

function KeyCard({ provider }: { provider: (typeof PROVIDERS)[number] }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [status, setStatus] = useState<Status>({ kind: 'none' });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAiKey(provider.id).then((key) => {
      if (!cancelled && key) setStatus({ kind: 'saved', masked: maskKey(key) });
    });
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  const runTest = useCallback(
    async (key: string, masked: string) => {
      setBusy(true);
      const result = await testAiKey(provider.id, key);
      setStatus(result.ok ? { kind: 'connected', masked } : { kind: 'error', masked, message: result.message });
      setBusy(false);
    },
    [provider.id],
  );

  const onSave = useCallback(async () => {
    const key = draft.trim();
    if (!key) return;
    setBusy(true);
    try {
      await saveAiKey(provider.id, key);
      setDraft('');
      await runTest(key, maskKey(key));
    } catch {
      setStatus({ kind: 'error', masked: null, message: 'Could not save the key on this device.' });
      setBusy(false);
    }
  }, [draft, provider.id, runTest]);

  const onTest = useCallback(async () => {
    const key = await getAiKey(provider.id);
    if (key) await runTest(key, maskKey(key));
  }, [provider.id, runTest]);

  const onRemove = useCallback(() => {
    Alert.alert(`Remove ${provider.name} key?`, 'The key is deleted from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeAiKey(provider.id);
          setStatus({ kind: 'none' });
        },
      },
    ]);
  }, [provider.id, provider.name]);

  const hasKey = status.kind !== 'none' && !(status.kind === 'error' && status.masked === null);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{provider.name}</Text>
      <Text style={styles.muted}>{provider.blurb}</Text>

      <View style={styles.statusRow}>
        {status.kind === 'none' && <Text style={styles.muted}>Not connected</Text>}
        {status.kind === 'saved' && <Text style={styles.muted}>Saved {status.masked} — not tested yet</Text>}
        {status.kind === 'connected' && <Text style={styles.ok}>Connected {status.masked}</Text>}
        {status.kind === 'error' && <Text style={styles.error}>{status.message}</Text>}
        {busy && <ActivityIndicator size="small" color={theme.colors.accent.primary} />}
      </View>

      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder={hasKey ? 'Paste a new key to replace it' : provider.placeholder}
        placeholderTextColor={theme.colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        editable={!busy}
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, (busy || draft.trim() === '') && styles.btnDisabled]}
          onPress={onSave}
          disabled={busy || draft.trim() === ''}
        >
          <Text style={styles.btnText}>Save and test</Text>
        </Pressable>
        {hasKey && (
          <>
            <Pressable style={styles.btnGhost} onPress={onTest} disabled={busy}>
              <Text style={styles.btnGhostText}>Test</Text>
            </Pressable>
            <Pressable style={styles.btnGhost} onPress={onRemove} disabled={busy}>
              <Text style={styles.btnGhostText}>Remove</Text>
            </Pressable>
          </>
        )}
      </View>

      <Pressable onPress={() => Linking.openURL(KEY_CONSOLE_URLS[provider.id])} hitSlop={8}>
        <Text style={styles.link}>Get a key ↗</Text>
      </Pressable>
    </View>
  );
}

export default function LabsScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    isLabsEnabled().then(setEnabled);
  }, []);

  const onToggle = useCallback((value: boolean) => {
    setEnabled(value);
    setLabsEnabled(value).catch(() => setEnabled(!value));
  }, []);

  const [frames, setFrames] = useState(false);
  useEffect(() => {
    isFrameExperimentEnabled().then(setFrames);
  }, []);
  const onToggleFrames = useCallback((value: boolean) => {
    setFrames(value);
    setFrameExperimentEnabled(value).catch(() => setFrames(!value));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Labs' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Experimental features that may change or disappear. AI match narration listens to the table, then explains
          what caused each life change and writes a recap.
        </Text>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.cardTitle}>AI features</Text>
              <Text style={styles.muted}>
                Shows match narration and the stats report ("Analyze") on this device.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={onToggle}
              trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary + '88' }}
              thumbColor={enabled ? theme.colors.accent.primary : theme.colors.text.muted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.cardTitle}>New player frames</Text>
              <Text style={styles.muted}>
                Casual and account matches, on this device only. Same number size and sidebar width for every player,
                brighter commander art, and a glow on the active frame. In an account match you can switch back to
                the current frames from Layout.
              </Text>
            </View>
            <Switch
              value={frames}
              onValueChange={onToggleFrames}
              trackColor={{ false: theme.colors.border.strong, true: theme.colors.accent.primary + '88' }}
              thumbColor={frames ? theme.colors.accent.primary : theme.colors.text.muted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your API keys</Text>
        <Text style={styles.muted}>
          Narration runs on your own accounts. Keys are stored only in this phone's keychain and are sent only to the
          service they belong to.
        </Text>

        {PROVIDERS.map((p) => (
          <KeyCard key={p.id} provider={p} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (t: AppTheme) => ({
  safe: { flex: 1, backgroundColor: t.colors.background.primary },
  content: { padding: spacing[4], gap: spacing[4] },
  intro: { color: t.colors.text.primary, fontSize: t.typography.size['body-md'], lineHeight: 22 },
  sectionTitle: {
    color: t.colors.text.muted,
    fontSize: t.typography.size.label,
    fontWeight: t.typography.weight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginTop: spacing[2],
  },
  card: {
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: t.colors.border.default,
  },
  cardTitle: {
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-lg'],
    fontWeight: t.typography.weight.semibold,
  },
  muted: { color: t.colors.text.muted, fontSize: t.typography.size['body-sm'] },
  ok: { color: t.colors.accent.primary, fontSize: t.typography.size['body-sm'], fontWeight: t.typography.weight.semibold },
  error: { flexShrink: 1, color: t.colors.status.error, fontSize: t.typography.size['body-sm'] },
  statusRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[2] },
  toggleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[3] },
  toggleText: { flex: 1, gap: 2 },
  input: {
    minHeight: 44,
    color: t.colors.text.primary,
    fontSize: t.typography.size['body-md'],
    borderWidth: 1,
    borderColor: t.colors.border.default,
    borderRadius: t.radius.md,
    paddingHorizontal: spacing[3],
  },
  actions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing[3] },
  btn: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  btnGhost: { minHeight: 44, paddingHorizontal: spacing[2], justifyContent: 'center' as const },
  btnGhostText: {
    color: t.colors.text.muted,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
  link: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-sm'],
    fontWeight: t.typography.weight.semibold,
  },
});
