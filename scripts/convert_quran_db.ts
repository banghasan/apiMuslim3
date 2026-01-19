import { DB } from "sqlite";

try {
  const quranJsonPath = new URL("../data/quran/quran.json", import.meta.url);
  const quranDbPath = new URL("../data/quran/quran.db", import.meta.url);

  // Ensure directory exists
  try {
    await Deno.mkdir(new URL("../data/quran", import.meta.url), {
      recursive: true,
    });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw e;
    }
  }

  console.log("Reading JSON data...");
  const jsonData = JSON.parse(await Deno.readTextFile(quranJsonPath));

  console.log("Creating Database...");
  const db = new DB(decodeURIComponent(quranDbPath.pathname));

  db.execute(`
  CREATE TABLE IF NOT EXISTS surahs (
    number INTEGER PRIMARY KEY,

    name TEXT,
    name_latin TEXT, -- This seems missing in JSON sample, will use name if not found or try to derive
    number_of_ayahs INTEGER,
    translation TEXT,
    revelation TEXT,
    description TEXT,
    audio_url TEXT
  )
`);

  db.execute(`
  CREATE TABLE IF NOT EXISTS ayahs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surah_number INTEGER,
    ayah_number INTEGER,
    arab TEXT,
    translation TEXT,
    tafsir_kemenag_short TEXT,
    tafsir_kemenag_long TEXT,
    tafsir_quraish TEXT,
    tafsir_jalalayn TEXT,
    audio_url TEXT,
    meta_juz INTEGER,
    meta_page INTEGER,
    meta_manzil INTEGER,
    meta_ruku INTEGER,
    meta_hizb_quarter INTEGER,
    meta_sajda_recommended INTEGER,
    meta_sajda_obligatory INTEGER,
    FOREIGN KEY(surah_number) REFERENCES surahs(number)
  )
`);

  console.log("Inserting Surahs and Ayahs...");

  const insertSurah = db.prepareQuery(`
  INSERT INTO surahs (number, name, name_latin, number_of_ayahs, translation, revelation, description, audio_url)
  VALUES (:number, :name, :name_latin, :number_of_ayahs, :translation, :revelation, :description, :audio_url)
`);

  const insertAyah = db.prepareQuery(`
  INSERT INTO ayahs (
    surah_number, ayah_number, arab, translation, 
    tafsir_kemenag_short, tafsir_kemenag_long, tafsir_quraish, tafsir_jalalayn,
    audio_url,
    meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter, 
    meta_sajda_recommended, meta_sajda_obligatory
  ) VALUES (
    :surah_number, :ayah_number, :arab, :translation,
    :tafsir_kemenag_short, :tafsir_kemenag_long, :tafsir_quraish, :tafsir_jalalayn,
    :audio_url,
    :meta_juz, :meta_page, :meta_manzil, :meta_ruku, :meta_hizb_quarter,
    :meta_sajda_recommended, :meta_sajda_obligatory
  )
`);

  db.transaction(() => {
    for (const surah of jsonData) {
      // console.log(`Processing Surah ${surah.number}: ${surah.name}`);
      insertSurah.execute({
        number: surah.number,
        name: surah.name, // The JSON "name" seems to be "Al-Fatihah" (Latin/English transliteration)
        name_latin: surah.name, // Usually "name" in myquran json is the latin one.
        number_of_ayahs: surah.numberOfAyahs,
        translation: surah.translation,
        revelation: surah.revelation,
        description: surah.description,
        audio_url: surah.audio,
      });

      for (const ayah of surah.ayahs) {
        insertAyah.execute({
          surah_number: surah.number,
          ayah_number: ayah.number.inSurah,
          arab: ayah.arab,
          translation: ayah.translation,
          tafsir_kemenag_short: ayah.tafsir?.kemenag?.short || null,
          tafsir_kemenag_long: ayah.tafsir?.kemenag?.long || null,
          tafsir_quraish: ayah.tafsir?.quraish || null,
          tafsir_jalalayn: ayah.tafsir?.jalalayn || null,
          audio_url: ayah.audio?.alafasy || null, // Defaulting to alafasy
          meta_juz: ayah.meta?.juz || null,
          meta_page: ayah.meta?.page || null,
          meta_manzil: ayah.meta?.manzil || null,
          meta_ruku: ayah.meta?.ruku || null,
          meta_hizb_quarter: ayah.meta?.hizbQuarter || null,
          meta_sajda_recommended: ayah.meta?.sajda?.recommended ? 1 : 0,
          meta_sajda_obligatory: ayah.meta?.sajda?.obligatory ? 1 : 0,
        });
      }
    }
  });

  insertSurah.finalize();
  insertAyah.finalize();

  console.log("Creating Indexes...");
  db.execute(
    "CREATE INDEX IF NOT EXISTS idx_ayahs_surah_number ON ayahs(surah_number)",
  );
  db.execute(
    "CREATE INDEX IF NOT EXISTS idx_ayahs_surah_ayah ON ayahs(surah_number, ayah_number)",
  );
  // Full Text Search could be added later if needed, e.g. using FTS5

  db.close();

  console.log("Conversion complete!");
} catch (error) {
  console.error("Conversion FAILED:", error);
  Deno.exit(1);
}
