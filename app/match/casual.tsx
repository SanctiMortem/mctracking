/**
 * /match/casual — In-account "casual / untracked match".
 *
 * Same in-memory tracker as the guest flow (BR-AUTH-01: zero API calls,
 * nothing persisted) but reachable while signed in — for lending the phone
 * to a friend or playing a quick game without writing it to history.
 *
 * Hosted as a fullScreenModal in the root Stack.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { FrameExperimentProvider } from '@/components/match/frameExperiment';
import { CasualMatch } from '@/components/match/CasualMatch';

export default function CasualMatchScreen() {
  const router = useRouter();

  // fullScreenModal needs dismiss(), not back(). When there's nothing on the
  // stack to dismiss (deep link, etc.) fall through to /(tabs) so the exit
  // always lands somewhere. Mirrors the X-button fix in app/match/setup.tsx.
  const handleExit = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  // Frame experiment sandbox: on for the signed-in casual match only. The
  // guest tracker and account matches render the frames as before.
  return (
    <FrameExperimentProvider>
      <CasualMatch onExit={handleExit} />
    </FrameExperimentProvider>
  );
}
