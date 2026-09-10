// Applique un lot de traductions aux 10 fichiers de langue.
// Entrée : un fichier JSON { "namespace.clef": { fr, en, es, zh, ar, pt, de, it, ru, ja }, ... }
//   - la valeur peut être une string, un tableau ou un objet (structure identique dans toutes les langues)
//   - si une langue manque pour une clef, on retombe sur `fr`
// Usage : node scripts/i18n-apply.mjs <lot.json>
import fs from "node:fs";
import path from "node:path";

const LOCALES = ["fr", "en", "es", "zh", "ar", "pt", "de", "it", "ru", "ja"];
const DIR = path.join(process.cwd(), "src/lib/i18n/messages");
const batchPath = process.argv[2];
if (!batchPath) {
  console.error("usage: node scripts/i18n-apply.mjs <lot.json>");
  process.exit(1);
}
const batch = JSON.parse(fs.readFileSync(batchPath, "utf8"));

function setDeep(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null || Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

let changed = 0;
for (const loc of LOCALES) {
  const file = path.join(DIR, `${loc}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, byLoc] of Object.entries(batch)) {
    const val = byLoc[loc] ?? byLoc.fr;
    if (val === undefined) {
      console.warn(`  ! ${key} : aucune valeur (ni ${loc} ni fr)`);
      continue;
    }
    setDeep(json, key, val);
    changed++;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
}

// contrôle de parité
const counts = LOCALES.map((loc) => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, `${loc}.json`), "utf8"));
  const n = (o) =>
    Object.values(o).reduce((a, v) => a + (v && typeof v === "object" ? n(v) : 1), 0);
  return [loc, n(j)];
});
console.log(`applied ${Object.keys(batch).length} clés × ${LOCALES.length} langues (${changed} écritures)`);
console.log("parité :", counts.map(([l, n]) => `${l}:${n}`).join("  "));
const uniq = new Set(counts.map(([, n]) => n));
if (uniq.size !== 1) console.warn("!!! parité rompue — vérifier le lot");
