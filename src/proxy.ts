import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 : "proxy" (ex-middleware) tourne sur le runtime Node.js.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/staff/:path*",
    "/admin/:path*",
    "/connexion",
    "/inscription",
  ],
};
