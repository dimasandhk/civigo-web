import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /**
   * Everything except Next.js internals and static assets, so the auth token is
   * refreshed on any request that might render a page or call a Server Function.
   *
   * Narrowing this also narrows session refresh. Server Functions are POSTs to
   * the route they are declared in, so excluding a path here silently excludes
   * its Server Functions too.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
