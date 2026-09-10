import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/i18n/messages");
const LOCALES = ["fr", "en", "es", "zh", "ar", "pt", "de", "it", "ru", "ja"];

function flat(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flat(v, prefix ? `${prefix}.${k}` : k),
  );
}

const load = (loc: string) => JSON.parse(readFileSync(join(DIR, `${loc}.json`), "utf8"));

test("all 10 locale files exist", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  for (const loc of LOCALES) assert.ok(files.includes(`${loc}.json`), `missing ${loc}.json`);
});

test("every locale has the exact same keys as fr", () => {
  const base = new Set(flat(load("fr")));
  for (const loc of LOCALES) {
    const keys = new Set(flat(load(loc)));
    const missing = [...base].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !base.has(k));
    assert.equal(missing.length, 0, `${loc} missing: ${missing.slice(0, 5).join(", ")}`);
    assert.equal(extra.length, 0, `${loc} extra: ${extra.slice(0, 5).join(", ")}`);
  }
});

test("no locale has an empty-string value where fr is non-empty (except deliberate)", () => {
  const fr = load("fr");
  const frFlat = Object.fromEntries(flat(fr).map((k) => [k, k.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown>)?.[p],fr)]));
  const allowEmpty = new Set(["aptPub.from"]); // « dès » n'a pas d'équivalent court en japonais
  for (const loc of LOCALES) {
    if (loc === "fr") continue;
    const m = load(loc);
    for (const [key, frVal] of Object.entries(frFlat)) {
      if (allowEmpty.has(key)) continue;
      const v = key.split(".").reduce<unknown>((a, p) => (a as Record<string, unknown>)?.[p],m);
      if (typeof frVal === "string" && frVal.length > 0) {
        assert.ok(typeof v === "string" && v.length > 0, `${loc}: ${key} is empty`);
      }
    }
  }
});
