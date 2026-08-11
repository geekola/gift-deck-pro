import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Note: this is `middleware.ts` (not `proxy.ts`) because the project is
// pinned to Next.js 14.2.x - the middleware -> proxy rename landed in
// Next.js 16. If this project ever upgrades past v16, this file (and its
// exported function name) needs to be renamed too, or it'll silently stop
// running.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
