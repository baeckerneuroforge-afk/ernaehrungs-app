"use client";

import { useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { NavbarShell } from "./navbar-shell";

export function NavbarWithClerk() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  // Invalidate server-rendered data whenever the auth state transitions
  // (login or logout) so every server component reflects the new state
  // without requiring a manual page reload.
  const lastUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const currentId = user?.id ?? null;
    if (lastUserIdRef.current === undefined) {
      lastUserIdRef.current = currentId;
      return;
    }
    if (lastUserIdRef.current !== currentId) {
      lastUserIdRef.current = currentId;
      router.refresh();
    }
  }, [isLoaded, user?.id, router]);

  return (
    <NavbarShell
      user={user ?? null}
      signOut={signOut}
      isLoaded={isLoaded}
    />
  );
}
