"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type NavBadgeState = {
  /** Shared per-business unread inquiry count. Null while still streaming in. */
  inquiryUnreadCount: number | null;
  setInquiryUnreadCount: (value: number) => void;
};

const NavBadgeContext = createContext<NavBadgeState>({
  inquiryUnreadCount: null,
  setInquiryUnreadCount: () => {},
});

export function NavBadgeProvider({ children }: { children: ReactNode }) {
  const [inquiryUnreadCount, setInquiryUnreadCount] = useState<number | null>(
    null,
  );

  return (
    <NavBadgeContext.Provider
      value={{ inquiryUnreadCount, setInquiryUnreadCount }}
    >
      {children}
    </NavBadgeContext.Provider>
  );
}

/**
 * Rendered by the streamed server slot (`InquiryUnreadBadgeSlot`). Applies
 * the server-fetched count into the client nav-badge state once it streams
 * in, so the instant shell never blocks on the count query.
 */
export function NavBadgeSync({ value }: { value: number }) {
  const { setInquiryUnreadCount } = useContext(NavBadgeContext);

  useEffect(() => {
    setInquiryUnreadCount(value);
  }, [setInquiryUnreadCount, value]);

  return null;
}

export function useNavBadges(): NavBadgeState {
  return useContext(NavBadgeContext);
}
