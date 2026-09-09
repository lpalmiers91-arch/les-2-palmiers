import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import {
  classify,
  hostSplitEnabled,
  isStaffHost,
  CLIENT_ORIGIN,
  STAFF_ORIGIN,
} from "@/lib/spaces";

// Le middleware est une garde RAPIDE et FAIL-SAFE :
//  - il rafraîchit la session Supabase (obligatoire avec @supabase/ssr) ;
//  - il redirige les visiteurs NON connectés vers la bonne page de connexion ;
//  - il applique le cloisonnement par hôte (si STAFF_HOST est défini).
// Le contrôle fin du rôle (client vs équipe) est fait dans chaque layout serveur,
// qui est le contexte de rendu fiable. On n'interroge PAS la base ici : une
// requête lente ne doit jamais envoyer un membre de l'équipe dans le mauvais espace.

const PUBLIC_CONNECTION = new Set(["/connexion", "/inscription", "/mot-de-passe", "/equipe"]);

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const space = classify(path);

  // 1. Cloisonnement par hôte (ne dépend pas de la session) ---------------
  if (hostSplitEnabled()) {
    const onStaffHost = isStaffHost(request.headers.get("host"));
    const teamRoute = space === "team" || space === "team-auth";
    const clientRoute =
      space === "client-app" || space === "client-auth" || space === "client-public";

    if (onStaffHost && (clientRoute || path === "/")) {
      if (path === "/") {
        const u = request.nextUrl.clone();
        u.pathname = "/staff";
        return NextResponse.redirect(u);
      }
      return CLIENT_ORIGIN
        ? NextResponse.redirect(new URL(path + request.nextUrl.search, CLIENT_ORIGIN))
        : new NextResponse("Not found", { status: 404 });
    }
    if (!onStaffHost && teamRoute) {
      return STAFF_ORIGIN
        ? NextResponse.redirect(new URL(path + request.nextUrl.search, STAFF_ORIGIN))
        : new NextResponse("Not found", { status: 404 });
    }
  }

  // 2. Routes sans besoin de session : on ne touche pas à Supabase --------
  const needsSession =
    space === "client-app" ||
    space === "team" ||
    space === "team-auth" ||
    space === "client-auth" ||
    space === "shared"; // /auth/* a besoin du rafraîchissement de cookie
  if (!needsSession) {
    return NextResponse.next({ request });
  }

  // 3. Session Supabase + gardes "non connecté" --------------------------
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

    const url = request.nextUrl.clone();

    if (!user) {
      if (space === "team") {
        url.pathname = "/equipe";
        url.search = "";
        url.searchParams.set("suite", path);
        return withCookies(NextResponse.redirect(url), response);
      }
      if (space === "client-app") {
        url.pathname = "/connexion";
        url.search = "";
        url.searchParams.set("suite", path);
        return withCookies(NextResponse.redirect(url), response);
      }
      return response; // client-auth / team-auth / shared : on laisse voir la page
    }

    // Connecté sur une page de connexion : on renvoie vers l'app.
    // Le layout de /app renverra vers /staff ou /admin si c'est un membre équipe.
    if (PUBLIC_CONNECTION.has(path)) {
      url.pathname = "/app";
      url.search = "";
      return withCookies(NextResponse.redirect(url), response);
    }

    return response;
  } catch {
    return response;
  }
}

function withCookies(target: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}
