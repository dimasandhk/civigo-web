import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { readSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth token and writes it back to the browser.
 *
 * Server Components can't set cookies, so without this running ahead of them
 * an expired access token is never renewed and users get logged out at
 * seemingly random moments.
 */
export async function updateSession(request: NextRequest) {
  const env = readSupabaseEnv();

  // Nothing to refresh until Supabase is configured. Pass the request straight
  // through so the app keeps working with an empty .env.local.
  if (!env) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  // `setAll` only hands over the cache headers on its first cookie write, so
  // keep them here to survive rebuilding the response more than once.
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        Object.assign(cacheHeaders, headers);

        // Mirror onto the request first so Server Components rendered later in
        // this same pass read the refreshed token rather than the expired one.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Stops a CDN or reverse proxy from caching a response that carries a
        // Set-Cookie, which would hand one user's session to the next visitor.
        for (const [key, value] of Object.entries(cacheHeaders)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Must be awaited before the response is returned. A refresh that finishes
  // after the response is committed cannot write its cookies back, and the
  // next request would just have to refresh all over again.
  await supabase.auth.getClaims();

  // Return this exact response. Building a fresh NextResponse here would drop
  // the refreshed cookies and log the user out.
  return response;
}
