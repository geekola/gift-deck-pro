import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Same pattern as platform-admin's guard: single authoritative,
// server-side role check on every request, rather than relying on the
// login form to have checked correctly at sign-in time. Closes the gap
// where a brand_user/platform_admin could previously sign in via the
// customer form and get waved through with no verification at all.
export default async function CustomerProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "customer") {
    redirect("/login?error=forbidden");
  }

  return <>{children}</>;
}
