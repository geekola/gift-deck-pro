import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";

// Same pattern as platform-admin's guard: single authoritative,
// server-side role check on every request, rather than relying on the
// login form to have checked correctly at sign-in time. Closes the gap
// where a brand_user/platform_admin could previously sign in via the
// customer form and get waved through with no verification at all.
//
// CustomerNav renders once here so every customer route gets it
// automatically - previously this layout rendered nothing but a guard,
// and every one of the 8 customer screens was a standalone dead end with
// no way to reach Settings/Gallery/Orders or even sign out short of
// typing a URL directly (same gap BrandNav.jsx closed for the brand
// portal, just never done here).
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

  return (
    <>
      <CustomerNav />
      {children}
    </>
  );
}
