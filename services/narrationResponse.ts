/** LABS — turns a narration write result into the HTTP answer. Shared by the narration and roast routes. */
import type { NarrationWriteResult } from '@/services/narration';

export function narrationWriteResponse(result: NarrationWriteResult): Response {
  if ('notFound' in result) {
    return Response.json({ error: 'NOT_FOUND', message: 'No narration for this match' }, { status: 404 });
  }
  if ('forbidden' in result) {
    return Response.json({ error: 'FORBIDDEN', message: 'Only players in this match can do that' }, { status: 403 });
  }
  if ('invalid' in result) {
    return Response.json({ error: 'BAD_REQUEST', message: result.invalid }, { status: 400 });
  }
  return Response.json({ success: true, data: result.data });
}
