import { createQuranService } from "../src/services/quran.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const dbPath = new URL("../data/quran/quran.db", import.meta.url).pathname;
const service = createQuranService(decodeURIComponent(dbPath));

Deno.test("Quran Service - Get All Surahs", () => {
  const surahs = service.getAllSurahs();
  assertEquals(surahs.length, 114);
  assertEquals(surahs[0].name_latin, "Al-Fatihah");
  assertEquals(surahs[113].name_latin, "An-Naas");
});

Deno.test("Quran Service - Get Specific Surah", () => {
  const surah = service.getSurah(1);
  assert(surah !== null);
  assertEquals(surah?.number, 1);
  assertEquals(surah?.name_latin, "Al-Fatihah");
  assertEquals(surah?.number_of_ayahs, 7);
});

Deno.test("Quran Service - Get Ayahs of Surah", () => {
  const ayahs = service.getAyahs(1);
  assertEquals(ayahs.length, 7);
  assertEquals(ayahs[0].ayah_number, 1);
  assert(ayahs[0].arab.length > 0);
  assert(ayahs[0].translation.length > 0);
});

Deno.test("Quran Service - Get Specific Ayah", () => {
  const ayah = service.getAyah(1, 1);
  assert(ayah !== null);
  assertEquals(ayah?.surah_number, 1);
  assertEquals(ayah?.ayah_number, 1);
});
