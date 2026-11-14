# Narration spike (SPIKE-001)

One question, answered before any recording feature is built: **can one phone on the table hear a pod well enough for speech-to-text and Claude to explain the match log?**

Nothing here is app code. It runs on this Mac, with your own keys.

## What you need

1. A real match, tracked in Sliver Counter as usual (an account match, not guest or casual).
2. A recording of that whole match from a phone's voice-memo app, phone on the table. Start recording **just before** you start the match in the app, and write down the clock time you hit record, to the second if you can.
3. Decklists on the decks in play help a lot (card names are fed to the transcriber as hints).
4. A file named `.env` in this folder, copied from `.env.example`:
   - `DEEPGRAM_API_KEY` — from the Deepgram console
   - `ANTHROPIC_API_KEY` — from the Claude Console
   - `DATABASE_URL` — the production database URL (used read-only)

## Run it

All commands from this folder (`scripts/spike-narration`). First time only: `npm install`.

```bash
# 1. Find the match and export its log
npx tsx --env-file=.env 1-export-match.ts --list
npx tsx --env-file=.env 1-export-match.ts <match-id>

# 2. Transcribe the recording (audio goes to Deepgram)
npx tsx --env-file=.env 2-transcribe.ts <match-id> ~/Downloads/game-night.m4a

# 3. Analyse (transcript + log go to Claude). --audio-start is when you hit record.
npx tsx --env-file=.env 3-analyze.ts <match-id> --audio-start 2026-11-20T20:14:05-06:00

# 4. After marking the review sheet, score it
npx tsx 4-score.ts out/<match-id>/review-opus-5-5.csv
```

Everything lands in `out/<match-id>/`, which is gitignored.

## How to judge the result

1. **`transcript.txt`** — skim it. Is it recognisably your game? Are card names right? Step 2 also prints how many speakers were detected; a 4-player pod should show about 4.
2. **`report-<model>.md`** — check the speaker mapping table first. If speakers are mapped to the wrong players, nothing after it can be right.
3. **`review-<model>.csv`** — open in Numbers or Excel. For each row, put `y` or `n` in the `correct` column: is that really what caused that life change? Then run step 4.

**Go** if high-confidence attributions (≥ 0.8) are right about 9 times in 10 and at least a third of events get explained. **No-go or change approach** if the speaker mapping is wrong or the transcript is unusable; then try the same match with the phone in the middle of the table, or two phones, before giving up.

## Options for step 3

- `--model claude-sonnet-5-5` or `--model claude-haiku-5-5` — rerun on a cheaper model to compare quality and cost. The default is `claude-opus-5-5`. Each run writes its own report and review sheet, and the report shows tokens and dollars for that match.
- `--effort low|medium|high|xhigh|max` — how hard the model thinks (default `high`).
- `--offset-seconds 20` — if quotes in the report consistently land before or after the events they belong to, shift the audio by that many seconds and rerun. Only step 3 needs rerunning; the transcript is reused.

## What leaves this Mac

- Step 1 only reads from the database.
- Step 2 sends the audio file to Deepgram.
- Step 3 sends the transcript, the match log, player names and decklists to Anthropic.

Keep the audio and `out/` out of git; delete them when you are done.
