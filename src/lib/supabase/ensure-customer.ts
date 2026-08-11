import type { SupabaseClient, User } from "@supabase/supabase-js";

// The `profiles` row (role='customer') gets created automatically by the
// handle_new_auth_user trigger (see supabase/migrations/...auth_profiles.sql).
// The `customers` row does not - it needs a name, and for password signups
// we already have one from the form. Call this once right after a
// successful sign-up or OAuth callback; it's a no-op if the row already
// exists (unique constraint on customers.id / onConflict below).
export async function ensureCustomerRow(
  supabase: SupabaseClient,
  user: User,
  nameOverride?: string
) {
  const name =
    nameOverride ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "New customer";

  const { error } = await supabase
    .from("customers")
    .upsert(
      { id: user.id, name, profile_complete: false },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (error) {
    // Not fatal to the auth flow - surface it, but let sign-in proceed.
    // The RLS policy customers_self_all covers this insert (id = auth.uid()).
    console.error("ensureCustomerRow failed:", error.message);
  }
}
