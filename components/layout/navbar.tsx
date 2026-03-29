"use client";

import dynamic from "next/dynamic";
import { NavbarShell } from "./navbar-shell";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const NavbarWithClerk = dynamic(
  () => import("./navbar-clerk").then((m) => m.NavbarWithClerk),
  { ssr: true }
);

export function Navbar() {
  if (hasClerk) {
    return <NavbarWithClerk />;
  }
  return <NavbarShell user={null} signOut={() => {}} />;
}
