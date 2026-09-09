import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Espaces protégés (le contrôle fin du rôle se fait dans chaque layout serveur).
const PROTECTED = ["/admin", "/staff", "/app"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("suite", path);
      return NextResponse.redirect(url);
    }

    if (user && (path === "/connexion" || path === "/inscription")) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      return NextResponse.redirect(url);
    }

    return response;
  } catch {
    // en cas de souci réseau/session, on laisse passer : les layouts serveur re-vérifient.
    return response;
  }
}
