/**
 * /match/casual — In-account "casual / untracked match".
 *
 * Same in-memory tracker as the guest flow (BR-AUTH-01: zero API calls,
 * nothing persisted) but reachable while signed in — for lending the phone
 * to a friend or playing a quick game without writing it to history.
 *
 * Hosted as a fullScreenModal in the root Stack.
 */
import { useRouter } from 'expo-router';

import { CasualMatch } from '@/components/match/CasualMatch';

export default function CasualMatchScreen() {
  const router = useRouter();

  // Pop the modal back to wherever the user opened it from. router.back()
  // (rather than replace('/(tabs)/')) keeps the navigation stack clean for
  // the case where the user opened the casual match from a non-Home tab.
  return <CasualMatch onExit={() => router.back()} />;
}
