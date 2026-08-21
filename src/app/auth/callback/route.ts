import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/supabase/ensure-customer";

type PendingBrandRegistration = {
  brandName: string;
  contactFirstName: string;
  contactLastName: string;
  phoneNumber: string;
  website: string;
  fulfilmentEmail: string;
  category: string;
};

// Handles the redirect back from Supabase after Google OAuth, and after an
// email confirmation link (both customer sign-up and brand registration,
// when email confirmation is turned on - see pending_brand_registration
// below for why brand registration needs special handling here).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const pendingBrand = data.user.user_metadata?.pending_brand_registration as
    | PendingBrandRegistration
    | undefined;

  if (pendingBrand) {
    // Password signup on the brand registration screen, deferred here
    // because email confirmation may be required - there's no session
    // (and therefore no auth.uid() for the RPC below) until the user
    // clicks the confirmation link and lands back on this route.
    const { error: rpcError } = await supabase.rpc("register_brand", {
      p_brand_name: pendingBrand.brandName,
      p_contact_first_name: pendingBrand.contactFirstName,
      p_contact_last_name: pendingBrand.contactLastName,
      p_phone_number: pendingBrand.phoneNumber,
      p_website: pendingBrand.website,
      p_fulfilment_email: pendingBrand.fulfilmentEmail,
      p_category: pendingBrand.category,
    });

    if (rpcError) {
      // Most likely cause: this confirmation link was already used once
      // and the brand was already created (register_brand rejects a
      // second call once role is no longer 'customer'). Not a real
      // failure from the user's point of view.
      console.error("register_brand failed:", rpcError.message);
    }

    return NextResponse.redirect(`${origin}/login?status=pending`);
  }

  // Login unification (via /login) exposes Google OAuth to whichever
  // account the email belongs to, not just new customer signups - so
  // this needs to route by actual role rather than assuming customer.
  // platform_admin is provisioned manually and never reaches this path
  // in practice (no Google button on its login), but it's handled here
  // defensively in case that ever changes.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, brand_id")
    .eq("id", data.user.id)
    .single();

  if (profile?.role === "platform_admin") {
    return NextResponse.redirect(`${origin}/platform-admin`);
  }

  if (profile?.role === "brand_user" && profile.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("status")
      .eq("id", profile.brand_id)
      .single();

    if (brand?.status === "approved") {
      return NextResponse.redirect(`${origin}/brand/products`);
    }
    if (brand?.status === "rejected") {
      return NextResponse.redirect(`${origin}/login?status=rejected`);
    }
    return NextResponse.redirect(`${origin}/login?status=pending`);
  }

  await ensureCustomerRow(supabase, data.user);
  const next = searchParams.get("next") ?? "/customer/categories";
  return NextResponse.redirect(`${origin}${next}`);
}
