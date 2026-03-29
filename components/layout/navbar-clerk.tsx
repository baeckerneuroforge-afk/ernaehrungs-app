"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { NavbarShell } from "./navbar-shell";

export function NavbarWithClerk() {
  const { user } = useUser();
  const { signOut } = useAuth();
  return <NavbarShell user={user ?? null} signOut={signOut} />;
}
