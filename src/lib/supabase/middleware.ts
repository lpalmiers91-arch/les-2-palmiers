import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// Espaces protégés et rôle minimal requis.
const GUARDS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/staff", roles: ["staff", "coordinator", "admin"] },
  { prefix: "/app", roles: ["client", "staff", "coordinator", "admin"] },
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const guard = GUARDS.find((g) => path === g.prefix || path.startsWith(g.prefix + "/"));

  if (guard) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("suite", path);
      return NextResponse.redirect(url);
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r) => r.role_id);
    const ok = guard.roles.some((r) => roles.includes(r));
    if (!ok) {
      const url = request.nextUrl.clone();
      url.pathname = roles.includes("admin")
        ? "/admin"
        : roles.some((r) => ["staff", "coordinator"].includes(r))
          ? "/staff"
          : "/app";
      return NextResponse.redirect(url);
    }
  }

  // déjà connecté → pas de page de connexion
  if (user && (path === "/connexion" || path === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}
