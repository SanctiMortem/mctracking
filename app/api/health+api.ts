/**
 * GET /api/health — DB connectivity check.
 * Returns { ok: true, db: "connected" } when Neon responds.
 */
import { db } from '@/services/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true, db: 'connected' });
  } catch (error) {
    return Response.json(
      { ok: false, db: 'error', message: String(error) },
      { status: 500 }
    );
  }
}
