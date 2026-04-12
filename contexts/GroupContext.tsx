/**
 * GroupContext — active group context for the app.
 *
 * ADR-004: Home banner shows active match of the selected context only.
 * ADR-005: context switcher lives in Home header (no dedicated screen).
 *
 * activeContext: 'personal' = no group scope, or a group_id string.
 * Groups are loaded eagerly when the user is signed in.
 *
 * PLAT-010 (EPIC-05)
 */
import { createContext, useCallback, useContext, useState } from 'react';

import type { GroupWithRole } from '@/hooks/useGroups';

interface GroupContextValue {
  activeContext: 'personal' | string;
  setActiveContext: (ctx: 'personal' | string) => void;
  userGroups: GroupWithRole[];
  setUserGroups: (groups: GroupWithRole[]) => void;
}

const GroupContext = createContext<GroupContextValue>({
  activeContext: 'personal',
  setActiveContext: () => {},
  userGroups: [],
  setUserGroups: () => {},
});

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [activeContext, setActiveContextState] = useState<'personal' | string>('personal');
  const [userGroups, setUserGroups] = useState<GroupWithRole[]>([]);

  const setActiveContext = useCallback((ctx: 'personal' | string) => {
    setActiveContextState(ctx);
  }, []);

  return (
    <GroupContext.Provider value={{ activeContext, setActiveContext, userGroups, setUserGroups }}>
      {children}
    </GroupContext.Provider>
  );
}

/** Returns the active group context and controls. */
export function useGroupContext() {
  return useContext(GroupContext);
}
