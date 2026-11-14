/**
 * GET    /api/decks/:id/decklist — the deck's card list (anyone who can view the deck)
 * POST   /api/decks/:id/decklist — import pasted text, replacing the list (owner only)
 * DELETE /api/decks/:id/decklist — remove the list (owner only)
 *
 * POST body: { text: string } — the raw pasted list. Parsing happens here so
 * every client strips set codes, foil tags and headers the same way.
 *
 * DECK-003 (EPIC-07)
 */
import { getAuth } from '@/services/auth';
import { parseDecklist } from '@/services/decklistParser';
import {
  MAX_DECKLIST_LINES,
  clearDecklist,
  getDecklist,
  importDecklist,
} from '@/services/decklists';
import { getRouteParam } from '@/services/route-params';

/** Generous cap on pasted text; a 100-card export is ~3 KB. */
const MAX_TEXT_LENGTH = 30_000;

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await getDecklist(userId, id);
  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json({ success: true, data: result.data });
}

export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (!body || typeof body.text !== 'string') {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'text', message: 'text must be a string' },
      { status: 400 },
    );
  }
  if (body.text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'text', message: 'Decklist is too long' },
      { status: 400 },
    );
  }

  const lines = parseDecklist(body.text);

  let result;
  try {
    result = await importDecklist(userId, id, lines);
  } catch (e) {
    // Scryfall unreachable or erroring — the stored list was not touched.
    console.error('[decklist] import failed', e);
    return Response.json(
      { error: 'SCRYFALL_UNAVAILABLE', message: 'Could not reach Scryfall. Try again in a moment.' },
      { status: 502 },
    );
  }

  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if ('empty' in result) {
    return Response.json(
      { error: 'VALIDATION_ERROR', field: 'text', message: 'No cards found in that text' },
      { status: 400 },
    );
  }
  if ('tooManyLines' in result) {
    return Response.json(
      {
        error: 'VALIDATION_ERROR',
        field: 'text',
        message: `A decklist can have at most ${MAX_DECKLIST_LINES} different cards`,
      },
      { status: 400 },
    );
  }

  return Response.json({ success: true, data: result.data });
}

export async function DELETE(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  const result = await clearDecklist(userId, id);
  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });

  return Response.json({ ok: true });
}
