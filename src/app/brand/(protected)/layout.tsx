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
    .select("status, return_line1, return_city, return_state, return_zip, return_country")
    .eq("id", profile.brand_id)
    .single();

  if (brand?.status === "rejected") {
    redirect("/brand/login?status=rejected");
  }

  if (brand?.status !== "approved") {
    redirect("/brand/login?status=pending");
  }

  // MVP step 5: nothing enforced a return address getting set once a
  // brand was approved (migration 0011 dropped the pre-approval DB
  // constraint). advance_requisition_state (migration 0020) now hard-
  // blocks invoicing an order without one; this banner is the earlier,
  // softer warning so a brand finds out before they hit that wall
  // rather than during it.
  const missingReturnAddress =
    !brand?.return_line1 ||
    !brand?.return_city ||
    !brand?.return_state ||
    !brand?.return_zip ||
    !brand?.return_country;

  return (
    <>
      {missingReturnAddress && (
        <div
          style={{
            fontFamily: "'Roboto', sans-serif",
            background: "rgba(185,129,40,0.14)",
            borderBottom: "1px solid rgba(185,129,40,0.35)",
            color: "#EAEAEA",
            fontSize: 13,
            padding: "10px 20px",
            textAlign: "center",
          }}
        >
          Your return address isn't set yet.{" "}
          <a href="/brand/settings" style={{ color: "#B98128", fontWeight: 500, textDecoration: "underline" }}>
            Add it in Company settings
          </a>{" "}
          — you won't be able to mark an order as invoiced until it's complete.
        </div>
      )}
      {children}
    </>
  );
}
