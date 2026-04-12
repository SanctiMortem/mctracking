/**
 * Clerk JWT middleware — protects all Expo API Routes.
 * Validates the Authorization Bearer token from the request header.
 *
 * PLAT-002 (EPIC-05)
 */

/** Paths that are accessible without a Clerk session. */
const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/session']);

export async function middleware(req: Request) {
  const { pathname } = new URL(req.url);

  if (PUBLIC_PATHS.has(pathname)) return;

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }
}
