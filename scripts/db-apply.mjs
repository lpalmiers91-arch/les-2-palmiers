// Applique un fichier de migration SQL via l'API Management Supabase.
// Usage : node scripts/db-apply.mjs supabase/migrations/<fichier>.sql
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db-apply.mjs <fichier.sql>");
  process.exit(1);
}
const sql = fs.readFileSync(file, "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "curl/8.4.0",
    },
    body: JSON.stringify({ query: sql }),
  },
);
const body = await res.json();
console.log(res.status, JSON.stringify(body).slice(0, 800));
process.exit(res.ok ? 0 : 1);
