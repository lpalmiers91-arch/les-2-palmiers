import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import {
  audienceFromRoles,
  classify,
  homeFor,
  hostSplitEnabled,
  isStaffHost,
  CLIENT_ORIGIN,
  STAFF_ORIGIN,
  type Space,
} from "@/lib/spaces";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Pages purement publiques hors mode multi-hôtes : rien à vérifier ici.
  const earlyPath = request.nextUrl.pathname;
  if (
    !hostSplitEnabled() &&
    earlyPath !== "/reserver" &&
    classify(earlyPath) === "client-public"
  ) {
    return response;
  }

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

    const url = request.nextUrl.clone();
    const path = url.pathname;
    const space = classify(path);
    const onStaffHost = isStaffHost(request.headers.get("host"));

    // ---- 1. Cloisonnement par hôte (si STAFF_HOST est défini) --------------
    if (hostSplitEnabled()) {
      const teamRoute = space === "team" || space === "team-auth";
      const clientRoute =
        space === "client-app" || space === "client-auth" || space === "client-public";

      if (onStaffHost && clientRoute) {
        // l'espace client n'existe pas sur l'hôte équipe
        return CLIENT_ORIGIN
          ? NextResponse.redirect(new URL(path + url.search, CLIENT_ORIGIN))
          : rewriteNotFound(request);
      }
      if (!onStaffHost && teamRoute) {
        // l'espace équipe n'existe pas sur l'hôte client
        return STAFF_ORIGIN
          ? NextResponse.redirect(new URL(path + url.search, STAFF_ORIGIN))
          : rewriteNotFound(request);
      }
      if (onStaffHost && path === "/") {
        url.pathname = "/staff";
        return NextResponse.redirect(url);
      }
    }

    // ---- 2. Gardes de rôle (les deux modes) ------------------------------
    let roles: string[] = [];
    if (user && (needsRole(space) || path === "/reserver")) {
      const { data } = await supabase.from("user_roles").select("role_id").eq("user_id", user.id);
      roles = (data ?? []).map((r) => r.role_id as string);
    }
    const audience = audienceFromRoles(roles);

    // espace équipe : /staff, /admin
    if (space === "team") {
      if (!user) {
        url.pathname = "/equipe";
        url.search = "";
        url.searchParams.set("suite", path);
        return NextResponse.redirect(url);
      }
      if (audience !== "team") {
        url.pathname = "/app";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    // connexion équipe : /equipe
    if (space === "team-auth" && user) {
      url.pathname = homeFor(audience, roles);
      url.search = "";
      return NextResponse.redirect(url);
    }

    // espace client : /app
    if (space === "client-app") {
      if (!user) {
        url.pathname = "/connexion";
        url.search = "";
        url.searchParams.set("suite", path);
        return NextResponse.redirect(url);
      }
      if (audience === "team") {
        url.pathname = homeFor(audience, roles);
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    // connexion / inscription client
    if (space === "client-auth" && user) {
      url.pathname = homeFor(audience, roles);
      url.search = "";
      return NextResponse.redirect(url);
    }

    // tunnel de réservation : réservé aux clients
    if (path === "/reserver" && user && audience === "team") {
      url.pathname = homeFor(audience, roles);
      url.search = "";
      return NextResponse.redirect(url);
    }

    return response;
  } catch {
    // souci réseau/session : on laisse passer, les layouts serveur re-vérifient.
    return response;
  }
}

function needsRole(space: Space): boolean {
  return space === "team" || space === "team-auth" || space === "client-app" || space === "client-auth";
}

function rewriteNotFound(_request: NextRequest) {
  return new NextResponse("Not found", { status: 404 });
}
