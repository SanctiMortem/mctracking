/**
 * Step 4 — score a review sheet you filled in by hand.
 *
 *   npx tsx 4-score.ts out/<match-id>/review-opus-5-5.csv
 *
 * Reads the "correct" column (y / n; blank = not reviewed) and prints how
 * often the model's attributions were right, overall and by confidence band.
 * That number is the go / no-go for the recording feature.
 */
import fs from 'node:fs';

/** Minimal CSV line parser for the sheet 3-analyze.ts writes (quoted fields, "" escapes). */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: 4-score.ts <review-….csv>');
  process.exit(1);
}

const [header, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
const cols = parseLine(header);
const iConf = cols.indexOf('confidence');
const iCorrect = cols.indexOf('correct');
if (iConf < 0 || iCorrect < 0) {
  console.error('This file does not have "confidence" and "correct" columns.');
  process.exit(1);
}

const rows = lines.map(parseLine).map((r) => ({
  confidence: Number(r[iConf]),
  mark: (r[iCorrect] ?? '').trim().toLowerCase(),
}));
const reviewed = rows.filter((r) => r.mark === 'y' || r.mark === 'n');
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}%`);
const right = (rs: typeof reviewed) => rs.filter((r) => r.mark === 'y').length;

console.log(`Reviewed ${reviewed.length} of ${rows.length} attributions`);
console.log(`Correct overall: ${right(reviewed)}/${reviewed.length} (${pct(right(reviewed), reviewed.length)})`);
for (const [label, lo, hi] of [
  ['confidence ≥ 0.8', 0.8, 1.01],
  ['confidence 0.5–0.8', 0.5, 0.8],
  ['confidence < 0.5', 0, 0.5],
] as const) {
  const band = reviewed.filter((r) => r.confidence >= lo && r.confidence < hi);
  console.log(`  ${label}: ${right(band)}/${band.length} (${pct(right(band), band.length)})`);
}
console.log(
  '\nRule of thumb: if the high-confidence band is right about 9 times in 10, the app can show those and leave the rest blank.',
);
