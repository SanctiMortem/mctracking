/**
 * matchLayout — persist per-match seat/rotation/layout metadata.
 *
 * The tracker screen receives rotations, player order, and layout variant
 * as URL params when the user first enters from setup. When they close the
 * app and resume the match, those params are gone — without persistence,
 * players appear in random order and face the wrong way.
 *
 * We store the metadata in SecureStore keyed by matchId. It's written at
 * setup time and on every tracker mount (so pre-existing matches recover
 * their layout the first time the user enters them). Cleared when a match
 * completes or is abandoned.
 */
import * as SecureStore from 'expo-secure-store';

export interface MatchLayout {
  rotations: Record<string, number>;
  playerOrder: string[];
  layoutVariant: string;
}

function keyFor(matchId: string): string {
  return `mtg_match_layout_${matchId}`;
}

export async function saveMatchLayout(matchId: string, layout: MatchLayout): Promise<void> {
  try {
    await SecureStore.setItemAsync(keyFor(matchId), JSON.stringify(layout));
  } catch {
    // SecureStore failures are non-fatal — the tracker falls back to default layout.
  }
}

export async function loadMatchLayout(matchId: string): Promise<MatchLayout | null> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MatchLayout>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.rotations &&
      typeof parsed.rotations === 'object' &&
      Array.isArray(parsed.playerOrder) &&
      typeof parsed.layoutVariant === 'string'
    ) {
      return parsed as MatchLayout;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearMatchLayout(matchId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(keyFor(matchId));
  } catch {
    // Ignored — stale keys are harmless.
  }
}
