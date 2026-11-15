/**
 * Stats report — the parts that keep a report consistent without a network:
 * sample labels, and holding Claude's answer to the data package (RPT-002).
 */
jest.mock('expo-secure-store', () => ({}));
jest.mock('@/services/api', () => ({ apiFetch: jest.fn() }));

import { cleanReport } from '@/services/labs/statsReport';
import { REPORT_OUTPUT_SCHEMA } from '@/services/labs/statsReportPrompt';
import { sampleLevel, type ReportData, type ReportStat } from '@/services/reportShared';

const stat = (id: string, matches: number, wins: number): ReportStat => ({
  id, label: id, matches, wins, sample: sampleLevel(matches),
});

const data: ReportData = {
  kind: 'deck',
  subject: 'Slivers',
  overall: stat('overall', 12, 5),
  by_color: [stat('color:G', 3, 1)],
  by_seat: [], by_pod_size: [], by_game_length: [], by_version: [], matchups: [], by_deck: [],
  wins_by_condition: [],
  version_changes: [],
  decks: [{
    id: 'd1', name: 'Slivers', commanders: ['Sliver Overlord'], color_identity: ['W', 'U', 'B', 'R', 'G'],
    version: 1, shape: null,
    cards: [{ name: 'Sol Ring', quantity: 1, type_line: 'Artifact', mana_value: 1, oracle_text: null }],
  }],
};

describe('sampleLevel', () => {
  it('labels match counts', () => {
    expect([0, 1, 4, 5, 9, 10, 40].map(sampleLevel)).toEqual(
      ['none', 'few', 'few', 'early', 'early', 'solid', 'solid'],
    );
  });
});

describe('cleanReport', () => {
  const raw = {
    headline: ' Doing fine. ',
    checkups: [
      { area: 'removal', level: 'low', cards: [], note: 'Thin.' },
      { area: 'lands', level: 'fine', cards: [], note: 'OK.' },
      { area: 'removal', level: 'high', cards: [], note: 'duplicate' },
      { area: 'made_up', level: 'fine', cards: [], note: '' },
    ],
    findings: [
      { title: 'Green', detail: 'Few games.', based_on: 'results', stat_id: 'color:G' },
      { title: 'Ghost', detail: 'Points nowhere.', based_on: 'results', stat_id: 'color:X' },
      { title: '', detail: 'No title.', based_on: 'decklist', stat_id: null },
      { title: 'c', detail: 'c', based_on: 'both', stat_id: 'overall' },
      { title: 'd', detail: 'd', based_on: 'decklist', stat_id: null },
      { title: 'e', detail: 'e', based_on: 'decklist', stat_id: null },
    ],
    suggestions: [1, 2, 3, 4].map((n) => ({ title: `t${n}`, detail: `d${n}` })),
  };

  it('orders checkups, drops unknown and duplicate areas', () => {
    const r = cleanReport(raw, data);
    expect(r.checkups.map((c) => c.area)).toEqual(['lands', 'removal']);
    expect(r.checkups[1].level).toBe('low');
  });

  it('keeps only stat ids that exist, and applies the caps', () => {
    const r = cleanReport(raw, data);
    expect(r.headline).toBe('Doing fine.');
    expect(r.findings).toHaveLength(4);
    expect(r.findings.map((f) => f.stat_id)).toEqual(['color:G', null, 'overall', null]);
    expect(r.suggestions).toHaveLength(3);
  });

  it('gives no checkups without a card list or for a player report', () => {
    expect(cleanReport(raw, { ...data, decks: [{ ...data.decks[0], cards: [] }] }).checkups).toEqual([]);
    expect(cleanReport(raw, { ...data, kind: 'player' }).checkups).toEqual([]);
  });

  it('rejects an empty answer', () => {
    expect(() => cleanReport({}, data)).toThrow();
  });
});

describe('output schema', () => {
  it('marks every object closed, as structured output requires', () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'object') expect(n.additionalProperties).toBe(false);
      Object.values(n).forEach(walk);
    };
    walk(REPORT_OUTPUT_SCHEMA);
  });
});
