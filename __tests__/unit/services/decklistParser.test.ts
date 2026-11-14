import { looksLikeDecklist, parseDecklist } from '@/services/decklistParser';

describe('parseDecklist', () => {
  it('parses plain "1 Card Name" lines', () => {
    expect(parseDecklist('1 Sol Ring\n1 Arcane Signet\n12 Forest')).toEqual([
      { quantity: 1, name: 'Sol Ring' },
      { quantity: 1, name: 'Arcane Signet' },
      { quantity: 12, name: 'Forest' },
    ]);
  });

  it('accepts "1x" and bare names', () => {
    expect(parseDecklist('1x Sol Ring\n2X Island\nCommand Tower')).toEqual([
      { quantity: 1, name: 'Sol Ring' },
      { quantity: 2, name: 'Island' },
      { quantity: 1, name: 'Command Tower' },
    ]);
  });

  it('strips Moxfield set codes, collector numbers and foil tags', () => {
    const text = [
      '1 Sol Ring (C21) 263',
      '1 Atraxa, Praetors\' Voice (2XM) 190 *F*',
      '1 Arcane Signet (SLD) 1234★ *E*',
      '1 Lightning Bolt (PLST) M11-149',
    ].join('\n');
    expect(parseDecklist(text).map((l) => l.name)).toEqual([
      'Sol Ring',
      "Atraxa, Praetors' Voice",
      'Arcane Signet',
      'Lightning Bolt',
    ]);
  });

  it('strips Archidekt categories and colour tags', () => {
    const text = '1x Cultivate (m21) 177 [Ramp] ^Have,#37d67a^\n1x Rhystic Study (jmp) 169 [Draw,Staples]';
    expect(parseDecklist(text).map((l) => l.name)).toEqual(['Cultivate', 'Rhystic Study']);
  });

  it('skips headers and blank lines', () => {
    const text = [
      'Commander',
      '1 Atraxa, Praetors\' Voice',
      '',
      'Creatures (2)',
      '1 Birds of Paradise',
      '// Lands',
      '1 Command Tower',
      'Deck:',
      '1 Sol Ring',
    ].join('\n');
    expect(parseDecklist(text).map((l) => l.name)).toEqual([
      "Atraxa, Praetors' Voice",
      'Birds of Paradise',
      'Command Tower',
      'Sol Ring',
    ]);
  });

  it('drops sideboard and maybeboard cards', () => {
    const text = [
      '1 Sol Ring',
      'SIDEBOARD:',
      '1 Mana Crypt',
      'Maybeboard (1)',
      '1 Mana Vault',
      'Deck',
      '1 Island',
    ].join('\n');
    expect(parseDecklist(text).map((l) => l.name)).toEqual(['Sol Ring', 'Island']);
  });

  it('keeps card names that start with a header word', () => {
    expect(parseDecklist("1 Commander's Sphere\nLand Tax").map((l) => l.name)).toEqual([
      "Commander's Sphere",
      'Land Tax',
    ]);
  });

  it('keeps split and double-faced names intact', () => {
    expect(parseDecklist('1 Fire // Ice (MH2) 290').map((l) => l.name)).toEqual(['Fire // Ice']);
  });

  it('merges duplicate names, case-insensitively', () => {
    expect(parseDecklist('5 Forest\n3 forest (UNF) 239')).toEqual([{ quantity: 8, name: 'Forest' }]);
  });
});

describe('looksLikeDecklist', () => {
  it('is true for 10+ quantity lines', () => {
    const text = Array.from({ length: 12 }, (_, i) => `1 Card ${i}`).join('\n');
    expect(looksLikeDecklist(text)).toBe(true);
  });

  it('is false for prose and short lists', () => {
    expect(looksLikeDecklist('hey are we playing friday?\nbring the atraxa deck')).toBe(false);
    expect(looksLikeDecklist('1 Sol Ring\n1 Island')).toBe(false);
  });
});
