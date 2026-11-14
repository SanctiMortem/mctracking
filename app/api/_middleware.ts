/**
 * Clerk JWT middleware — rejects requests without a verified Clerk session.
 *
 * NOTE: Expo Router does not load this file. It only runs a root-level
 * `app/+middleware.ts`, and only with `unstable_useServerMiddleware` enabled
 * in the `expo-router` plugin config. Until it is moved there, the real
 * gate is `getAuth(req)` inside each route handler — every route must call
 * it and answer 401 on a null `userId`.
 *
 * PLAT-002 (EPIC-05)
 */
import { getAuth } from '@/services/auth';

/** Paths that are accessible without a Clerk session. */
const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/session']);

export default async function middleware(req: Request) {
  const { pathname } = new URL(req.url);

  if (PUBLIC_PATHS.has(pathname)) return;

  const { userId } = await getAuth(req);

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }
}
