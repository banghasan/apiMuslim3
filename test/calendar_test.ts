import { assert, assertEquals } from "@std/assert";
import {
  buildCeInfo,
  convertHijriToGregorian,
  createZonedDate,
  getGregorianParts,
  parseAdjustment,
  parseCalendarMethod,
  parseGregorianDate,
  parseHijriDate,
  safeCalendarTimeZone,
  shiftZonedDate,
} from "../src/lib/calendar.ts";

Deno.test("parseAdjustment handles valid and invalid values", () => {
  assertEquals(parseAdjustment(undefined), 0);
  assertEquals(parseAdjustment("3"), 3);
  assertEquals(parseAdjustment("-2"), -2);
  assertEquals(parseAdjustment("3.9"), 3);
  assertEquals(parseAdjustment("abc"), 0);
});

Deno.test("parseGregorianDate validates input format", () => {
  const parts = parseGregorianDate("2025-11-24");
  assert(parts);
  assertEquals(parts.year, 2025);
  assertEquals(parts.month, 11);
  assertEquals(parts.day, 24);
  assertEquals(parseGregorianDate("2025-13-01"), null);
  assertEquals(parseGregorianDate("abcd"), null);
});

Deno.test("parseHijriDate validates input format", () => {
  const parts = parseHijriDate("1445-11-02");
  assert(parts);
  assertEquals(parts.year, 1445);
  assertEquals(parts.month, 11);
  assertEquals(parts.day, 2);
  assertEquals(parseHijriDate("1445-00-10"), null);
});

Deno.test("parseCalendarMethod supports aliases", () => {
  assertEquals(parseCalendarMethod("standar").calendar, "islamic");
  assertEquals(parseCalendarMethod("umalqura").calendar, "islamic-umalqura");
  assertEquals(parseCalendarMethod("civil").calendar, "islamic-civil");
  assertEquals(parseCalendarMethod("unknown").calendar, "islamic");
});

Deno.test("safeCalendarTimeZone falls back on invalid input", () => {
  assertEquals(safeCalendarTimeZone("Asia/Jakarta"), "Asia/Jakarta");
  assertEquals(safeCalendarTimeZone("invalid/zone"), "Asia/Jakarta");
});

Deno.test("convertHijriToGregorian maps to expected CE date", () => {
  const hijri = parseHijriDate("1445-11-02");
  assert(hijri);
  const converted = convertHijriToGregorian(hijri, "islamic", "Asia/Jakarta");
  assert(converted);
  const ceInfo = buildCeInfo(converted, "Asia/Jakarta");
  assertEquals(ceInfo.year, 2024);
  assertEquals(ceInfo.month, 5);
  assertEquals(ceInfo.day, 10);
});

Deno.test("shiftZonedDate respects time zones", () => {
  const baseParts = parseGregorianDate("2024-05-10");
  assert(baseParts);
  const baseDate = createZonedDate(baseParts, "Asia/Jakarta");
  const shifted = shiftZonedDate(baseDate, 1, "Asia/Jakarta");
  const parts = getGregorianParts(shifted, "Asia/Jakarta");
  assertEquals(parts.day, 11);
  assertEquals(parts.month, 5);
});
