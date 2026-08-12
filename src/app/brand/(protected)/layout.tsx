import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Same guard pattern as platform-admin and customer. This is also the
// real enforcement point for "a brand can't operate the portal until
// approved" - RLS already blocks the underlying queries (see
// auth_brand_is_approved() in migration 0009), but without this a
// pending/rejected brand_user could still load the page shells directly
// by URL and see a broken or misleading UI instead of being told why.
export default async function BrandProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/brand/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, brand_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "brand_user" || !profile.brand_id) {
    redirect("/brand/login?error=forbidden");
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("status")
    .eq("id", profile.brand_id)
    .single();

  if (brand?.status === "rejected") {
    redirect("/brand/login?status=rejected");
  }

  if (brand?.status !== "approved") {
    redirect("/brand/login?status=pending");
  }

  return <>{children}</>;
}
