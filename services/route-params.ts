/**
 * Extract dynamic route params from the request URL path.
 *
 * Expo Router SDK 55 may pass `params` as undefined in API routes.
 * Parsing from the URL is reliable regardless of the SDK version.
 *
 * Usage:
 *   const id = getRouteParam(req, 'id');
 *   // For /api/players/abc-123 → returns "abc-123"
 */
export function getRouteParam(req: Request, paramName: string): string | null {
  const { pathname } = new URL(req.url);
  // Expo API routes follow: /api/<resource>/<param>/...
  // Split and find the segment after the pattern `[paramName]` in the file path.
  // For routes like /api/players/:id or /api/groups/:id/invite,
  // the param is always the segment after the resource name.
  const segments = pathname.split('/').filter(Boolean);

  // Match the file-system route pattern against the URL to find the param value.
  // The route file path encodes param positions with brackets, e.g.:
  //   /api/players/[id]+api.ts        → URL: /api/players/<value>
  //   /api/stats/decks/[id]+api.ts    → URL: /api/stats/decks/<value>
  //   /api/groups/[id]/invite+api.ts  → URL: /api/groups/<value>/invite
  //
  // Strategy: find the last UUID-shaped segment, or for simple 'id' params,
  // scan right-to-left for a non-static segment (not a known resource name).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (paramName === 'id') {
    // Prefer UUID match (most reliable)
    for (let i = segments.length - 1; i >= 1; i--) {
      if (UUID_RE.test(segments[i])) return segments[i];
    }
    // Fallback: last segment that isn't a static route part
    // For /api/stats/decks/<id> → return <id> (last segment)
    const last = segments[segments.length - 1];
    if (last && last !== 'api') return last;
  }

  return null;
}
