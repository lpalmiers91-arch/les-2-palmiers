import { test } from "node:test";
import assert from "node:assert/strict";
import { formatXOF, parseRange, nightsBetween } from "../src/lib/format.ts";

test("formatXOF: null-safe", () => {
  assert.equal(formatXOF(null), "—");
  assert.equal(formatXOF(undefined), "—");
});

test("formatXOF: deterministic grouping", () => {
  const s = formatXOF(1234567);
  assert.equal(s.replace(/\s/g, " "), "1 234 567 XOF");
});

test("formatXOF: rounds", () => {
  assert.ok(formatXOF(999.6).startsWith("1"));
});

test("parseRange: parses a Postgres daterange", () => {
  assert.deepEqual(parseRange("[2026-11-10,2026-11-14)"), { start: "2026-11-10", end: "2026-11-14" });
});

test("parseRange: handles quoted bounds", () => {
  assert.deepEqual(parseRange('["2026-01-01","2026-01-05")'), { start: "2026-01-01", end: "2026-01-05" });
});

test("nightsBetween: counts nights", () => {
  assert.equal(nightsBetween("2026-11-10", "2026-11-14"), 4);
  assert.equal(nightsBetween("2026-11-10", "2026-11-10"), 0);
});
