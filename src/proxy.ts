import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 : "proxy" (ex-middleware) tourne sur le runtime Node.js.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // tout sauf les assets statiques, les fichiers Next et les fichiers avec extension
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon.svg|apple-icon|.*\\.[\\w]+$).*)"],
};
