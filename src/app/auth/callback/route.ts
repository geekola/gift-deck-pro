import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/supabase/ensure-customer";

// Handles the redirect back from Supabase after Google OAuth (and any
// other redirect-based flow, e.g. email confirmation links later).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/customer/categories";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await ensureCustomerRow(supabase, data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed or no code present - send back to sign-in with an error flag.
  return NextResponse.redirect(`${origin}/customer/sign-in?error=auth`);
}
