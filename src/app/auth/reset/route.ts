import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for the "reset your password" email link (all three
// roles - customer, brand_user, platform_admin - share one auth.users
// table, so this route is role-agnostic by design).
//
// Deliberately NOT reusing /auth/callback: that route runs
// ensureCustomerRow() and the pending-brand-registration RPC on every
// code exchange, both signup-specific side effects that would be wrong
// to fire for someone who's just resetting a password (e.g. it would
// create a bogus `customers` row for a brand_user or platform_admin).
// This route does one thing - exchange the recovery code for a session -
// and hands off to /reset-password to actually set the new password.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Most likely an expired or already-used reset link.
    return NextResponse.redirect(`${origin}/reset-password?error=invalid`);
  }

  return NextResponse.redirect(`${origin}/reset-password`);
}
