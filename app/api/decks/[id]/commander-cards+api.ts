/**
 * GET /api/decks/:id/commander-cards — the deck's commander(s) as full cards
 * (image, type line, rules text), for anyone who can view the deck.
 *
 * Lets the deck screen show a commander the same way it shows a card from
 * the list. Served from the `cards` cache; Scryfall is only asked the first
 * time a commander is opened.
 */
import { getAuth } from '@/services/auth';
import { getDeckCommanderCards } from '@/services/decklists';
import { getRouteParam } from '@/services/route-params';

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = getRouteParam(req, 'id');
  if (!id) return Response.json({ error: 'BAD_REQUEST', message: 'Missing id' }, { status: 400 });

  try {
    const result = await getDeckCommanderCards(userId, id);
    if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    if ('forbidden' in result) return Response.json({ error: 'Forbidden' }, { status: 403 });
    return Response.json({ success: true, data: result.data });
  } catch (e) {
    console.error('[GET /api/decks/:id/commander-cards]', e);
    return Response.json(
      { error: 'INTERNAL', message: (e as Error).message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
