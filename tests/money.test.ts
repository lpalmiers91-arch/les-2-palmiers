import { test } from "node:test";
import assert from "node:assert/strict";
import { convertFromXof, formatMoney, isCurrency, CURRENCIES } from "../src/lib/money.ts";

const rates = { EUR: 655.957, USD: 605 };

test("convertFromXof: XOF is identity", () => {
  assert.equal(convertFromXof(10000, "XOF", rates), 10000);
});

test("convertFromXof: EUR divides by rate", () => {
  assert.ok(Math.abs(convertFromXof(655957, "EUR", rates) - 1000) < 0.01);
});

test("convertFromXof: unknown currency falls back to XOF amount", () => {
  assert.equal(convertFromXof(5000, "JPY", rates), 5000);
});

test("formatMoney: XOF format is deterministic", () => {
  assert.equal(formatMoney(45000, "XOF", rates), "45 000 XOF");
});

test("formatMoney: EUR produces a currency string", () => {
  const s = formatMoney(655957, "EUR", rates);
  assert.match(s, /1\s?000|1 000/);
  assert.ok(s.includes("€"));
});

test("isCurrency validates against the known list", () => {
  assert.ok(isCurrency("EUR"));
  assert.ok(!isCurrency("XXX"));
  assert.ok(!isCurrency(undefined));
});

test("CURRENCIES always includes XOF first", () => {
  assert.equal(CURRENCIES[0].code, "XOF");
});
