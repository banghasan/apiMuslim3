import { DB } from "sqlite";

export type Surah = {
  number: number;
  name: string;
  name_latin: string;
  number_of_ayahs: number;
  translation: string;
  revelation: string;
  description: string;
  audio_url: string;
};

export type Ayah = {
  id: number;
  surah_number: number;
  ayah_number: number;
  arab: string;
  translation: string;
  tafsir_kemenag_short: string | null;
  tafsir_kemenag_long: string | null;
  tafsir_quraish: string | null;
  tafsir_jalalayn: string | null;
  audio_url: string | null;
  meta_juz: number | null;
  meta_page: number | null;
  meta_manzil: number | null;
  meta_ruku: number | null;
  meta_hizb_quarter: number | null;
  meta_sajda_recommended: boolean;
  meta_sajda_obligatory: boolean;
};

export type QuranService = ReturnType<typeof createQuranService>;

export const createQuranService = (dbPath: string) => {
  const db = new DB(dbPath);

  const getAllSurahs = (): Surah[] => {
    const rows = db.query<
      [number, string, string, number, string, string, string, string]
    >(
      "SELECT number, name, name_latin, number_of_ayahs, translation, revelation, description, audio_url FROM surahs ORDER BY number ASC",
    );
    return rows.map((row) => ({
      number: row[0],
      name: row[1],
      name_latin: row[2],
      number_of_ayahs: row[3],
      translation: row[4],
      revelation: row[5],
      description: row[6],
      audio_url: row[7],
    }));
  };

  const getSurah = (surahNumber: number): Surah | null => {
    const row = db.query<
      [number, string, string, number, string, string, string, string]
    >(
      "SELECT number, name, name_latin, number_of_ayahs, translation, revelation, description, audio_url FROM surahs WHERE number = ?",
      [surahNumber],
    );
    if (row.length === 0) return null;
    const r = row[0];
    return {
      number: r[0],
      name: r[1],
      name_latin: r[2],
      number_of_ayahs: r[3],
      translation: r[4],
      revelation: r[5],
      description: r[6],
      audio_url: r[7],
    };
  };

  const getAyahs = (surahNumber: number): Ayah[] => {
    const rows = db.query(
      `SELECT id, surah_number, ayah_number, arab, translation, 
              tafsir_kemenag_short, tafsir_kemenag_long, tafsir_quraish, tafsir_jalalayn,
              audio_url, meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter,
              meta_sajda_recommended, meta_sajda_obligatory
       FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC`,
      [surahNumber],
    );

    // deno-lint-ignore no-explicit-any
    return rows.map((r: any) => ({
      id: r[0],
      surah_number: r[1],
      ayah_number: r[2],
      arab: r[3],
      translation: r[4],
      tafsir_kemenag_short: r[5],
      tafsir_kemenag_long: r[6],
      tafsir_quraish: r[7],
      tafsir_jalalayn: r[8],
      audio_url: r[9],
      meta_juz: r[10],
      meta_page: r[11],
      meta_manzil: r[12],
      meta_ruku: r[13],
      meta_hizb_quarter: r[14],
      meta_sajda_recommended: Boolean(r[15]),
      meta_sajda_obligatory: Boolean(r[16]),
    }));
  };

  const getAyah = (surahNumber: number, ayahNumber: number): Ayah | null => {
    const rows = db.query(
      `SELECT id, surah_number, ayah_number, arab, translation, 
              tafsir_kemenag_short, tafsir_kemenag_long, tafsir_quraish, tafsir_jalalayn,
              audio_url, meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter,
              meta_sajda_recommended, meta_sajda_obligatory
       FROM ayahs WHERE surah_number = ? AND ayah_number = ?`,
      [surahNumber, ayahNumber],
    );

    if (rows.length === 0) return null;
    // deno-lint-ignore no-explicit-any
    const r: any = rows[0];
    return {
      id: r[0],
      surah_number: r[1],
      ayah_number: r[2],
      arab: r[3],
      translation: r[4],
      tafsir_kemenag_short: r[5],
      tafsir_kemenag_long: r[6],
      tafsir_quraish: r[7],
      tafsir_jalalayn: r[8],
      audio_url: r[9],
      meta_juz: r[10],
      meta_page: r[11],
      meta_manzil: r[12],
      meta_ruku: r[13],
      meta_hizb_quarter: r[14],
      meta_sajda_recommended: Boolean(r[15]),
      meta_sajda_obligatory: Boolean(r[16]),
    };
  };

  const getRandomAyah = (): Ayah => {
    const rows = db.query(
      `SELECT id, surah_number, ayah_number, arab, translation, 
              tafsir_kemenag_short, tafsir_kemenag_long, tafsir_quraish, tafsir_jalalayn,
              audio_url, meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter,
              meta_sajda_recommended, meta_sajda_obligatory
       FROM ayahs ORDER BY RANDOM() LIMIT 1`,
    );

    // deno-lint-ignore no-explicit-any
    const r: any = rows[0];
    return {
      id: r[0],
      surah_number: r[1],
      ayah_number: r[2],
      arab: r[3],
      translation: r[4],
      tafsir_kemenag_short: r[5],
      tafsir_kemenag_long: r[6],
      tafsir_quraish: r[7],
      tafsir_jalalayn: r[8],
      audio_url: r[9],
      meta_juz: r[10],
      meta_page: r[11],
      meta_manzil: r[12],
      meta_ruku: r[13],
      meta_hizb_quarter: r[14],
      meta_sajda_recommended: Boolean(r[15]),
      meta_sajda_obligatory: Boolean(r[16]),
    };
  };

  const close = () => db.close();

  return { getAllSurahs, getSurah, getAyahs, getAyah, getRandomAyah, close };
};
