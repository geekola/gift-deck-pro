import { redirect } from "next/navigation";

// Login unification: customer + brand login now live at /login (see
// UnifiedLogin.jsx). Kept as a redirect rather than deleted so existing
// bookmarks/links to this URL still land somewhere useful, and any
// query params (e.g. ?error=forbidden) carry through.
export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const qs = params.toString();
  redirect(`/login${qs ? `?${qs}` : ""}`);
}
