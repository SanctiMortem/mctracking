/**
 * About & Legal — attributions, third-party content rights, and support links.
 * Accessed via Settings → "About & Legal". Required for App Store / Play
 * Console submission (see docs/legal/APP_STORE_SUBMISSION_TEXT.md).
 */
import { useCallback } from 'react';
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/styles/tokens';
import type { AppTheme } from '@/styles/themes/types';

const PRIVACY_URL = 'https://mctracker-about-agency.vercel.app/privacy';
const CONTENT_RIGHTS_URL = 'https://mctracker-about-agency.vercel.app/content-rights';
const SUPPORT_EMAIL = 'support@aboutagency.com';
const WOTC_FAN_CONTENT_URL = 'https://company.wizards.com/en/legal/fancontentpolicy';
const SCRYFALL_URL = 'https://scryfall.com';
const SCRYFALL_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc/4.0/';

export default function AboutScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const styles = useThemedStyles(createStyles);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    String(Constants.expoConfig?.android?.versionCode ?? '');

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          contentMaxWidth
            ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number }
            : undefined,
        ]}
      >
        {/* ── App header ─────────────────────────────────────────────── */}
        <View style={styles.appHeader}>
          <Text style={styles.appName}>{t('about.appName')}</Text>
          <Text style={styles.appTagline}>{t('about.tagline')}</Text>
          <Text style={styles.version}>
            {t('about.versionLabel')} {version}
            {buildNumber ? ` · ${t('about.buildLabel')} ${buildNumber}` : ''}
          </Text>
        </View>

        {/* ── Links ──────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t('about.legal')}</Text>
        <View style={styles.card}>
          <LinkRow
            label={t('about.privacyPolicy')}
            onPress={() => openUrl(PRIVACY_URL)}
            styles={styles}
          />
          <Divider styles={styles} />
          <LinkRow
            label={t('about.contentRights')}
            onPress={() => openUrl(CONTENT_RIGHTS_URL)}
            styles={styles}
          />
          <Divider styles={styles} />
          <LinkRow
            label={t('about.support')}
            value={SUPPORT_EMAIL}
            onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
            styles={styles}
          />
        </View>

        {/* ── Wizards of the Coast Fan Content disclaimer ────────────── */}
        <Text style={styles.sectionHeader}>{t('about.fanContent')}</Text>
        <View style={styles.card}>
          <View style={styles.block}>
            <Text style={styles.blockBody}>
              {t('about.fanContentBody')}
            </Text>
            <Pressable
              onPress={() => openUrl(WOTC_FAN_CONTENT_URL)}
              accessibilityRole="link"
            >
              <Text style={styles.inlineLink}>{t('about.fanContentLink')}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Scryfall ───────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t('about.cardData')}</Text>
        <View style={styles.card}>
          <View style={styles.block}>
            <Text style={styles.blockBody}>
              {t('about.scryfallBody')}
            </Text>
            <View style={styles.inlineLinkRow}>
              <Pressable onPress={() => openUrl(SCRYFALL_URL)} accessibilityRole="link">
                <Text style={styles.inlineLink}>scryfall.com</Text>
              </Pressable>
              <Text style={styles.blockBody}>  ·  </Text>
              <Pressable onPress={() => openUrl(SCRYFALL_LICENSE_URL)} accessibilityRole="link">
                <Text style={styles.inlineLink}>CC BY-NC 4.0</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Open source ────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t('about.openSource')}</Text>
        <View style={styles.card}>
          <View style={styles.block}>
            <Text style={styles.blockBody}>{t('about.openSourceBody')}</Text>
            <Text style={styles.creditLine}>React Native · Expo · Expo Router — MIT</Text>
            <Text style={styles.creditLine}>Drizzle ORM — Apache-2.0</Text>
            <Text style={styles.creditLine}>Clerk SDK for Expo — MIT</Text>
            <Text style={styles.creditLine}>Ionicons — MIT</Text>
            <Text style={styles.creditLine}>
              Space Grotesk · Manrope · Big Shoulders Display · Noto Serif · Work Sans — SIL Open Font License 1.1
            </Text>
          </View>
        </View>

        {/* ── Copyright footer ───────────────────────────────────────── */}
        <Text style={styles.copyright}>{t('about.copyright')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  label,
  value,
  onPress,
  styles,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

function Divider({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.divider} />;
}

function createStyles(t: AppTheme) {
  return {
    safe: { flex: 1 as const, backgroundColor: t.colors.background.primary },

    scroll: {
      paddingVertical: spacing[4],
      paddingBottom: spacing[12],
    },

    appHeader: {
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[6],
      gap: spacing[2],
    },
    appName: {
      color: t.colors.text.primary,
      fontSize: t.typography.size['heading-lg'],
      fontFamily: t.typography.fontFamily.headline,
      fontWeight: t.typography.weight.bold,
      textAlign: 'center' as const,
    },
    appTagline: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-md'],
      textAlign: 'center' as const,
    },
    version: {
      color: t.colors.text.muted,
      fontSize: t.typography.size['body-sm'],
      marginTop: spacing[1],
    },

    sectionHeader: {
      color: t.colors.text.muted,
      fontSize: t.typography.size['body-sm'],
      fontWeight: t.typography.weight.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
      paddingBottom: spacing[2],
    },

    card: {
      backgroundColor: t.colors.background.elevated,
      marginHorizontal: spacing[4],
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      overflow: 'hidden' as const,
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.border.subtle,
      marginHorizontal: spacing[4],
    },

    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      minHeight: 52,
    },
    rowLabel: {
      color: t.colors.text.primary,
      fontSize: t.typography.size['body-lg'],
      flexShrink: 1 as const,
    },
    rowRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      flexShrink: 1 as const,
    },
    rowValue: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
      maxWidth: 180,
    },
    chevron: {
      color: t.colors.text.muted,
      fontSize: 20,
      lineHeight: 24,
    },

    block: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      gap: spacing[3],
    },
    blockBody: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
      lineHeight: 20,
    },
    inlineLink: {
      color: t.colors.accent.primary,
      fontSize: t.typography.size['body-sm'],
      fontWeight: t.typography.weight.medium,
    },
    inlineLinkRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
    },
    creditLine: {
      color: t.colors.text.secondary,
      fontSize: t.typography.size['body-sm'],
    },

    copyright: {
      color: t.colors.text.muted,
      fontSize: t.typography.size['body-sm'],
      textAlign: 'center' as const,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[8],
    },
  };
}
