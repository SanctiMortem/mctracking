/**
 * GuestContext — tracks whether the user is in Guest mode.
 *
 * Guest mode: tracking without auth, no cloud persistence (BR-AUTH-01).
 * When isGuest=true, AuthGate in _layout.tsx skips the redirect to /auth.
 *
 * PLAT-003 (EPIC-05)
 */
import { createContext, useCallback, useContext, useState } from 'react';

interface GuestContextValue {
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextValue>({
  isGuest: false,
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);

  const enterGuestMode = useCallback(() => setIsGuest(true), []);
  const exitGuestMode = useCallback(() => setIsGuest(false), []);

  return (
    <GuestContext.Provider value={{ isGuest, enterGuestMode, exitGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
}

/** Returns guest mode state and controls. */
export function useGuest() {
  return useContext(GuestContext);
}
