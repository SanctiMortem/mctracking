/**
 * LABS — entry point to the AI stats report (RPT-003).
 *
 * Renders nothing unless Labs is switched on for this device, so the report
 * stays hidden from everyone who has not opted in. The caller decides whether
 * the viewer may analyse the subject (own deck / own profile) and simply does
 * not render the button otherwise.
 */
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { isLabsEnabled } from '@/services/labs/aiKeys';
import type { ReportKind } from '@/services/reportShared';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

export function AnalyzeButton({ kind, id }: { kind: ReportKind; id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isLabsEnabled().then((on) => {
      if (!cancelled) setEnabled(on);
    });
    return () => { cancelled = true; };
  }, []);

  if (!enabled) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/report', params: { kind, id } } as never)}
    >
      <View style={styles.text}>
        <Text style={styles.title}>✦ {t(kind === 'deck' ? 'report.analyzeDeck' : 'report.analyzeMe')}</Text>
        <Text style={styles.hint}>{t('report.analyzeHint')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const createStyles = (t: AppTheme) => ({
  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    backgroundColor: t.colors.background.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.accent.primary,
    padding: spacing[4],
  },
  text: { flex: 1, gap: 2 },
  title: {
    color: t.colors.accent.primary,
    fontSize: t.typography.size['body-md'],
    fontWeight: t.typography.weight.semibold,
  },
  hint: { color: t.colors.text.muted, fontSize: t.typography.size.caption },
  chevron: { color: t.colors.accent.primary, fontSize: t.typography.size['heading-md'] },
});
