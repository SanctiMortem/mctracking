/**
 * GET  /api/reports?kind=deck|player&id=<uuid> — the user's saved AI stats
 *      report for that deck or player, or null.
 * POST /api/reports?kind=…&id=…  body { data, report, model } — save it,
 *      replacing any earlier one.
 *
 * The report is written on the phone with the user's own Claude key; this
 * route only stores and returns it. Private to the user who ran it.
 *
 * RPT-004
 */
import { getAuth } from '@/services/auth';
import { getSavedReport, saveReport, type SavedReportResult } from '@/services/savedReports';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A report with its data package, rules text removed, is a few KB per deck. */
const MAX_BODY_CHARS = 400_000;

function subject(req: Request): { kind: 'deck' | 'player'; id: string } | null {
  const params = new URL(req.url).searchParams;
  const kind = params.get('kind');
  const id = params.get('id') ?? '';
  if ((kind !== 'deck' && kind !== 'player') || !UUID_RE.test(id)) return null;
  return { kind, id };
}

function respond(result: SavedReportResult): Response {
  if ('notFound' in result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if ('forbidden' in result) return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  if ('invalid' in result) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Not a valid report' }, { status: 400 });
  }
  return Response.json({ success: true, data: result.data });
}

export async function GET(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const s = subject(req);
  if (!s) return Response.json({ error: 'BAD_REQUEST', message: 'kind and id are required' }, { status: 400 });

  try {
    return respond(await getSavedReport(userId, s.kind, s.id));
  } catch (e) {
    console.error('[GET /api/reports]', e);
    return Response.json({ error: 'INTERNAL' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await getAuth(req);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const s = subject(req);
  if (!s) return Response.json({ error: 'BAD_REQUEST', message: 'kind and id are required' }, { status: 400 });

  const text = await req.text().catch(() => '');
  if (text.length === 0 || text.length > MAX_BODY_CHARS) {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Report is empty or too large' }, { status: 400 });
  }
  let body: { data?: unknown; report?: unknown; model?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: 'VALIDATION_ERROR', message: 'Body must be JSON' }, { status: 400 });
  }

  try {
    return respond(await saveReport(userId, s.kind, s.id, { data: body.data, report: body.report, model: body.model }));
  } catch (e) {
    console.error('[POST /api/reports]', e);
    return Response.json({ error: 'INTERNAL' }, { status: 500 });
  }
}
