import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const tokens = {
  bgBase: "#0F0F0F",
  surface: "#181818",
  surfaceRaised: "#1F1F1F",
  textPrimary: "#EAEAEA",
  textSecondary: "#AFAFAF",
  border: "#2A2A2A",
  gold: "#B98128",
};

// This used to be a raw index of all 26 routes with stale "still local
// mock data" copy - useful while every screen really was a disconnected
// mock, but the app's fully wired now (see [C] Tasks.md) and this was the
// production root. Replaced with an actual entry point: signed-out
// visitors get a real landing page, signed-in visitors skip it entirely
// and land straight in their role's home - same three-way split
// auth/callback already uses after login, just triggered by visiting "/"
// instead of an OAuth redirect. platform_admin has no self-signup path
// and isn't publicly discoverable by design (see PlatformAdminLogin.jsx),
// so it's deliberately not linked here - still reachable directly at
// /platform-admin/login for the people who need it.
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "platform_admin") redirect("/platform-admin");
    if (profile?.role === "brand_user") redirect("/brand/products");
    if (profile?.role === "customer") redirect("/customer/categories");
    // Unrecognized/missing profile row - safest fallback is the same
    // place an expired or invalid session lands.
    redirect("/login");
  }

  return (
    <main
      style={{
        fontFamily: "'Roboto', sans-serif",
        background: tokens.bgBase,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 3,
            background: tokens.gold,
            borderRadius: 2,
            margin: "0 auto 20px auto",
          }}
        />
        <h1 style={{ fontSize: 30, fontWeight: 700, color: tokens.textPrimary, margin: "0 0 10px 0" }}>
          Gift Deck Pro
        </h1>
        <p style={{ fontSize: 15, color: tokens.textSecondary, margin: "0 0 36px 0", lineHeight: 1.6 }}>
          The gifting platform connecting fashion brands with the influencers and talent who wear
          them.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <Link
            href="/sign-up"
            style={{
              display: "block",
              padding: "13px 0",
              fontSize: 14.5,
              fontWeight: 500,
              color: "#0F0F0F",
              background: tokens.gold,
              borderRadius: 8,
              textDecoration: "none",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            style={{
              display: "block",
              padding: "12px 0",
              fontSize: 14.5,
              fontWeight: 500,
              color: tokens.textPrimary,
              background: "transparent",
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              textDecoration: "none",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Sign In
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            textAlign: "left",
          }}
        >
          <div
            style={{
              flex: 1,
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 500, color: tokens.textPrimary, margin: "0 0 4px 0" }}>
              For talent & customers
            </p>
            <p style={{ fontSize: 12, color: tokens.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Browse and request gifted product from the brands you have access to.
            </p>
          </div>
          <div
            style={{
              flex: 1,
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontSize: 12.5, fontWeight: 500, color: tokens.textPrimary, margin: "0 0 4px 0" }}>
              For brands
            </p>
            <p style={{ fontSize: 12, color: tokens.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Manage your catalogue, gifting allowances, and fulfillment in one place.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
