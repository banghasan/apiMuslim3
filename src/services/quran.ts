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
  image_url: string | null;
  meta_juz: number | null;
  meta_page: number | null;
  meta_manzil: number | null;
  meta_ruku: number | null;
  meta_hizb_quarter: number | null;
  meta_sajda_recommended: boolean;
  meta_sajda_obligatory: boolean;
};

export type AyahWithSurah = Ayah & {
  surah: Pick<
    Surah,
    | "number"
    | "name"
    | "name_latin"
    | "number_of_ayahs"
    | "translation"
    | "revelation"
  >;
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
              audio_url, image_url, meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter,
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
    }));
  };

  const getAyah = (surahNumber: number, ayahNumber: number): Ayah | null => {
    const rows = db.query(
      `SELECT id, surah_number, ayah_number, arab, translation, 
              tafsir_kemenag_short, tafsir_kemenag_long, tafsir_quraish, tafsir_jalalayn,
              audio_url, image_url, meta_juz, meta_page, meta_manzil, meta_ruku, meta_hizb_quarter,
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
    };
  };

  const getRandomAyah = (): AyahWithSurah => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       ORDER BY RANDOM() LIMIT 1`,
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    };
  };

  const getSajdaAyahs = (): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_sajda_recommended = 1 OR a.meta_sajda_obligatory = 1
       ORDER BY a.surah_number, a.ayah_number ASC`,
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const getAyahsByJuz = (juzNumber: number): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_juz = ?
       ORDER BY a.surah_number, a.ayah_number ASC`,
      [juzNumber],
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const getAyahsByPage = (pageNumber: number): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_page = ?
       ORDER BY a.surah_number, a.ayah_number ASC`,
      [pageNumber],
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const getAyahsByManzil = (manzilNumber: number): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_manzil = ?
       ORDER BY a.surah_number, a.ayah_number ASC`,
      [manzilNumber],
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const getAyahsByRuku = (rukuNumber: number): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_ruku = ?
       ORDER BY a.surah_number, a.ayah_number ASC`,
      [rukuNumber],
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const getAyahsByHizb = (hizbNumber: number): AyahWithSurah[] => {
    const rows = db.query(
      `SELECT a.id, a.surah_number, a.ayah_number, a.arab, a.translation, 
              a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
              a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
              a.meta_sajda_recommended, a.meta_sajda_obligatory,
              s.number, s.name, s.name_latin, s.number_of_ayahs, s.translation, s.revelation
       FROM ayahs a
       JOIN surahs s ON a.surah_number = s.number
       WHERE a.meta_hizb_quarter = ?
       ORDER BY a.surah_number, a.ayah_number ASC`,
      [hizbNumber],
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
      image_url: r[10],
      meta_juz: r[11],
      meta_page: r[12],
      meta_manzil: r[13],
      meta_ruku: r[14],
      meta_hizb_quarter: r[15],
      meta_sajda_recommended: Boolean(r[16]),
      meta_sajda_obligatory: Boolean(r[17]),
      surah: {
        number: r[18],
        name: r[19],
        name_latin: r[20],
        number_of_ayahs: r[21],
        translation: r[22],
        revelation: r[23],
      },
    }));
  };

  const close = () => db.close();

  return {
    getAllSurahs,
    getSurah,
    getAyahs,
    getAyah,
    getRandomAyah,
    getSajdaAyahs,
    getAyahsByJuz,
    getAyahsByPage,
    getAyahsByManzil,
    getAyahsByRuku,
    getAyahsByHizb,
    close,
  };
};
