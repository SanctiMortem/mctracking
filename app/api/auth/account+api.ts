/**
 * DELETE /api/auth/account — Permanently delete the authed user's account.
 *
 * Required by App Store Guideline 5.1.1(v).
 * See services/account.ts for the deletion strategy.
 */
import { getAuth } from '@/services/auth';
import { deleteAccount } from '@/services/account';

export async function DELETE(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteAccount(userId);
    return Response.json({ success: true }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
