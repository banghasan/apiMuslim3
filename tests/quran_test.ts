import { createQuranService } from "../src/services/quran.ts";
import { assert, assertEquals } from "@std/assert";

const dbPath = new URL("../data/quran/quran.db", import.meta.url).pathname;
const service = createQuranService(decodeURIComponent(dbPath));

Deno.test("Quran Service - Get All Surahs", () => {
  const surahs = service.getAllSurahs();
  assertEquals(surahs.length, 114);
  assertEquals(surahs[0].name_latin, "Al-Fatihah");
  assertEquals(surahs[113].name_latin, "An-Nas");
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
  assert(ayahs[0].image_url, "Image URL harus ada");
});

Deno.test("Quran Service - Get Specific Ayah", () => {
  const ayah = service.getAyah(1, 1);
  assert(ayah !== null);
  assertEquals(ayah?.surah_number, 1);
  assertEquals(ayah?.ayah_number, 1);
  assert(ayah?.image_url, "Image URL harus ada");
});

Deno.test("Quran Service - Get Random Ayah", () => {
  const ayah = service.getRandomAyah();
  assert(ayah !== null);
  assert(ayah.id > 0);
  assert(ayah.surah_number >= 1 && ayah.surah_number <= 114);
  assert(ayah.ayah_number >= 1);
  assert(ayah.arab.length > 0);
  assert(ayah.image_url, "Image URL harus ada");
  assert(ayah.surah !== undefined, "Surah object should be present");
  assert(ayah.surah.name.length > 0, "Surah name should be present");
  console.log(
    `Random Ayah: Surah ${ayah.surah_number} (${ayah.surah.name_latin}), Ayah ${ayah.ayah_number}`,
  );
});

Deno.test("Quran Service - Get Sajda Ayahs", () => {
  const ayahs = service.getSajdaAyahs();
  assert(ayahs.length > 0, "Should return sajda ayahs");
  ayahs.forEach((ayah) => {
    assert(
      ayah.meta_sajda_recommended || ayah.meta_sajda_obligatory,
      `Ayah ${ayah.surah_number}:${ayah.ayah_number} should have sajda marker`,
    );
    assert(ayah.surah !== undefined, "Surah object should be present");
  });
  console.log(`Found ${ayahs.length} Sajda Ayahs`);
});
