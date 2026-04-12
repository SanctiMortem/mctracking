/**
 * Unit tests — i18n locale files
 * PLAT-009 (EPIC-05)
 *
 * Verifies:
 *   1. EN and ES have exactly the same set of keys (no missing / extra).
 *   2. MTG terms that must stay in English are identical in both locales.
 *   3. No key maps to an empty string in either locale.
 */

import en from '../../../locales/en.json';
import es from '../../../locales/es.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively collect all dot-separated key paths from a nested object. */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/** Retrieve a nested value by dot-path. */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const enKeys = new Set(collectKeys(en as unknown as Record<string, unknown>));
const esKeys = new Set(collectKeys(es as unknown as Record<string, unknown>));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('i18n locale files', () => {
  describe('key parity — EN vs ES', () => {
    it('EN has no keys missing from ES', () => {
      const missing = [...enKeys].filter((k) => !esKeys.has(k));
      expect(missing).toEqual([]);
    });

    it('ES has no keys missing from EN', () => {
      const extra = [...esKeys].filter((k) => !enKeys.has(k));
      expect(extra).toEqual([]);
    });
  });

  describe('no empty values', () => {
    it('EN has no empty string values', () => {
      const empty = [...enKeys].filter(
        (k) => getByPath(en as unknown as Record<string, unknown>, k) === '',
      );
      expect(empty).toEqual([]);
    });

    it('ES has no empty string values', () => {
      const empty = [...esKeys].filter(
        (k) => getByPath(es as unknown as Record<string, unknown>, k) === '',
      );
      expect(empty).toEqual([]);
    });
  });

  describe('MTG terms — identical in EN and ES (BR-I18N-02)', () => {
    const mtgTermKeys = [
      'game.commander',
      'game.commanderDamage',
      'game.lifeTotal',
      'game.poison',
      'game.infect',
      'game.proliferate',
      'game.scoop',
      'game.concede',
      'game.partner',
      'game.wubrg',
      'match.winCondition.commander_damage',
      'match.winCondition.infect',
      'match.winCondition.combo',
      'match.winCondition.mill',
      'match.winCondition.concede',
      'match.winCondition.commander_damage_short',
      'match.winCondition.infect_short',
      'match.winCondition.combo_short',
      'match.winCondition.mill_short',
      'match.winCondition.concede_short',
    ];

    it.each(mtgTermKeys)('%s is identical in EN and ES', (key) => {
      const enVal = getByPath(en as unknown as Record<string, unknown>, key);
      const esVal = getByPath(es as unknown as Record<string, unknown>, key);
      expect(esVal).toBe(enVal);
    });
  });
});
