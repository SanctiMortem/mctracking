/**
 * AccountPlayerContext — holds the signed-in user's account player.
 *
 * On first sign-in the user is prompted to set a player name.
 * Once created, the account player is cached here for the session.
 */
import { createContext, useCallback, useContext, useState } from 'react';

import type { Player } from '@/db/index';

interface AccountPlayerContextValue {
  accountPlayer: Player | null;
  setAccountPlayer: (player: Player | null) => void;
  needsSetup: boolean;
  setNeedsSetup: (val: boolean) => void;
}

const AccountPlayerContext = createContext<AccountPlayerContextValue>({
  accountPlayer: null,
  setAccountPlayer: () => {},
  needsSetup: false,
  setNeedsSetup: () => {},
});

export function AccountPlayerProvider({ children }: { children: React.ReactNode }) {
  const [accountPlayer, setAccountPlayer] = useState<Player | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  return (
    <AccountPlayerContext.Provider
      value={{ accountPlayer, setAccountPlayer, needsSetup, setNeedsSetup }}
    >
      {children}
    </AccountPlayerContext.Provider>
  );
}

/** Returns the current user's account player and setup state. */
export function useAccountPlayer() {
  return useContext(AccountPlayerContext);
}
