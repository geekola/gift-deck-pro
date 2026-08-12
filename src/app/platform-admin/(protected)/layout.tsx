import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Guards every route under platform-admin/(protected)/* - this group
// exists specifically so platform-admin/login stays a sibling, outside
// this layout, and doesn't get caught in its own redirect loop.
//
// This is the authoritative check: PlatformAdminLogin doesn't duplicate
// the role check client-side, it just signs in and sends the browser
// here. If the role's wrong, this is what bounces them back out.
export default async function PlatformAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/platform-admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "platform_admin") {
    redirect("/platform-admin/login?error=forbidden");
  }

  return <>{children}</>;
}
