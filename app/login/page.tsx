import { redirect } from "next/navigation";

// Redirect old login URL to new Clerk sign-in
export default function LoginRedirect() {
  redirect("/sign-in");
}
