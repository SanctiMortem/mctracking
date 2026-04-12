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

  // For routes like /api/groups/[id]/invite → segments: ['api', 'groups', '<value>', 'invite']
  // For routes like /api/players/[id]       → segments: ['api', 'players', '<value>']
  // The param 'id' is always at index 2 (third segment after 'api' + resource)
  if (paramName === 'id' && segments.length >= 3) {
    return segments[2];
  }

  return null;
}
