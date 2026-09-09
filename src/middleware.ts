import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // tout sauf les assets statiques et l'optimiseur d'images
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|apartment/|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico)$).*)",
  ],
};
