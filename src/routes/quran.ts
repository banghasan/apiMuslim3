import type { AppEnv } from "~/types.ts";
import type { QuranService } from "~/services/quran.ts";
import type { QuranSearchService } from "~/services/quran_search.ts";
import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";

export type RegisterQuranRoutesOptions = {
  app: OpenAPIHono<AppEnv>;
  docBaseUrl: string;
  quranService: QuranService;
  quranSearchService?: QuranSearchService | null;
};

export const registerQuranRoutes = ({
  app,
  docBaseUrl,
  quranService,
  quranSearchService,
}: RegisterQuranRoutesOptions) => {
  const surahSchema = z.object({
    number: z.number().openapi({ example: 1 }),
    name: z.string().openapi({ example: "الفاتحة" }),
    name_latin: z.string().openapi({ example: "Al-Fatihah" }),
    number_of_ayahs: z.number().openapi({ example: 7 }),
    translation: z.string().openapi({ example: "Pembukaan" }),
    revelation: z.string().openapi({ example: "Makkiyah" }),
    description: z.string().openapi({ example: "Surat Al Faatihah ..." }),
    audio_url: z.string().openapi({ example: "https://..." }),
  });

  const ayahSchema = z.object({
    id: z.number().openapi({ example: 1 }),
    surah_number: z.number().openapi({ example: 1 }),
    ayah_number: z.number().openapi({ example: 1 }),
    arab: z.string().openapi({ example: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ" }),
    translation: z.string().openapi({ example: "Dengan nama Allah ..." }),
    audio_url: z.string().nullable().openapi({ example: "https://..." }),
    image_url: z.string().nullable().openapi({ example: "https://..." }),
    tafsir: z.object({
      kemenag: z.object({
        short: z.string().nullable(),
        long: z.string().nullable(),
      }),
      quraish: z.string().nullable(),
      jalalayn: z.string().nullable(),
    }),
    meta: z.object({
      juz: z.number().nullable(),
      page: z.number().nullable(),
      manzil: z.number().nullable(),
      ruku: z.number().nullable(),
      hizb_quarter: z.number().nullable(),
      sajda: z.object({
        recommended: z.boolean(),
        obligatory: z.boolean(),
      }),
    }),
  });

  const paginationQuerySchema = z.object({
    page: z.string().optional().default("1").transform((v) => parseInt(v, 10)).pipe(z.number().min(1)),
    limit: z.string().optional().default("10").transform((v) => parseInt(v, 10)).pipe(z.number().min(1).max(100)),
  });

  const paginationMetaSchema = z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  });

  const randomAyahResponseSchema = z.object({
    status: z.boolean(),
    data: ayahSchema.extend({
      surah: z.object({
        number: z.number().openapi({ example: 1 }),
        name: z.string().openapi({ example: "Al-Fatihah" }),
        name_latin: z.string().openapi({ example: "Al-Fatihah" }),
        number_of_ayahs: z.number().openapi({ example: 7 }),
        translation: z.string().openapi({ example: "Pembukaan" }),
        revelation: z.string().openapi({ example: "Makkiyah" }),
      }),
    }),
  });

  // GET /quran - List all surahs
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran",
      tags: ["Quran"],
      summary: "Daftar Surat",
      description: `Daftar surat adalah daftar semua surat yang ada di dalam Al-Quran.`,
      responses: {
        200: {
          description: "Daftar Surat",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(surahSchema),
              }),
            },
          },
        },
      },
    }),
    (c) => {
      const data = quranService.getAllSurahs();
      return c.json({ status: true, data }, 200);
    },
  );

  // GET /quran/random - Get a random ayah
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/random",
      tags: ["Quran"],
      summary: "Ayat Acak",
      description: `Ayat acak adalah ayat yang dipilih secara acak dari Al-Quran. Ayat ini bisa berupa ayat dari surah mana saja dan dari juz berapa saja. Ayat acak ini bisa digunakan untuk berbagai keperluan, seperti untuk dibaca sebagai motivasi atau untuk dibagikan kepada orang lain.`,
      responses: {
        200: {
          description: "Detail Ayat Acak",
          content: {
            "application/json": {
              schema: randomAyahResponseSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/random"),
    }),
    (c) => {
      const ayahData = quranService.getRandomAyah();
      const formattedAyah = {
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      };

      return c.json({ status: true, data: formattedAyah }, 200);
    },
  );

  // GET /quran/sajda - Get all sajda ayahs
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/sajda",
      tags: ["Quran"],
      summary: "Ayat Sajdah",
      description: `Dalam konteks database Al-Quran, kolom sajadah (atau sujud tilawah) biasanya digunakan untuk menandai ayat-ayat yang mengharuskan atau menyarankan pembacanya untuk bersujud setelah membacanya.

Pembagian menjadi Recommended dan Obligatory berkaitan dengan perbedaan hukum fiqih di antara madzhab-madzhab Islam:

1. **Obligatory (Wajib):**
   - Merujuk pada ayat-ayat sujud yang diwajibkan oleh mayoritas ulama atau madzhab tertentu.
   - Dalam praktik, ini berarti pembaca harus melakukan sujud tilawah jika membaca atau mendengar ayat ini.
   - Contoh paling umum adalah ayat-ayat sujud yang disepakati oleh hampir semua madzhab.

2. **Recommended (Sunnah/Dianjurkan):**
   - Merujuk pada ayat-ayat sujud yang dianjurkan (sunnah) oleh sebagian ulama atau madzhab, tetapi tidak diwajibkan.
   - Pembaca dianjurkan untuk bersujud, tetapi tidak berdosa jika tidak melakukannya.
   - Ini bisa mencakup ayat-ayat yang dianggap sujud oleh beberapa madzhab tetapi tidak oleh yang lain, atau ayat-ayat yang memiliki status hukum yang sedikit berbeda tergantung pada interpretasi.

Secara keseluruhan, kolom ini membantu mengklasifikasikan ayat-ayat sujud berdasarkan tingkat kewajiban hukumnya, memungkinkan aplikasi untuk memberikan panduan yang sesuai dengan interpretasi fiqih yang berbeda.`,
      responses: {
        200: {
          description: "Daftar Ayat Sajdah",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/sajda"),
    }),
    (c) => {
      const data = quranService.getSajdaAyahs();
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData }, 200);
    },
  );

  // GET /quran/juz/:number - Get ayahs by Juz
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/juz/{number}",
      tags: ["Quran"],
      summary: "Ayat per Juz",
      description: `Mendapatkan semua ayat dalam Juz tertentu. Al-Quran dibagi menjadi 30 Juz.`,
      request: {
        params: z.object({
          number: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(30),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Daftar Ayat dalam Juz",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/juz/30"),
    }),
    (c) => {
      const { number } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const { data, total } = quranService.getAyahsByJuz(number, page, limit);
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/page/:number - Get ayahs by Page
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/page/{number}",
      tags: ["Quran"],
      summary: "Ayat per Halaman",
      description: `Mendapatkan semua ayat dalam halaman tertentu. Al-Quran memiliki 604 halaman.`,
      request: {
        params: z.object({
          number: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(604),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Daftar Ayat dalam Halaman",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/page/1"),
    }),
    (c) => {
      const { number } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const { data, total } = quranService.getAyahsByPage(number, page, limit);
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/manzil/:number - Get ayahs by Manzil
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/manzil/{number}",
      tags: ["Quran"],
      summary: "Ayat per Manzil",
      description: `Mendapatkan semua ayat dalam Manzil tertentu. Al-Quran dibagi menjadi 7 Manzil untuk memudahkan pembacaan mingguan.`,
      request: {
        params: z.object({
          number: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(7),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Daftar Ayat dalam Manzil",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/manzil/1"),
    }),
    (c) => {
      const { number } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const { data, total } = quranService.getAyahsByManzil(number, page, limit);
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/ruku/:number - Get ayahs by Ruku
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/ruku/{number}",
      tags: ["Quran"],
      summary: "Ayat per Ruku",
      description: `Mendapatkan semua ayat dalam Ruku tertentu. Ruku adalah pembagian tematik dalam Al-Quran.`,
      request: {
        params: z.object({
          number: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Daftar Ayat dalam Ruku",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/ruku/1"),
    }),
    (c) => {
      const { number } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const { data, total } = quranService.getAyahsByRuku(number, page, limit);
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/hizb/:number - Get ayahs by Hizb Quarter
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/hizb/{number}",
      tags: ["Quran"],
      summary: "Ayat per Hizb",
      description: `Mendapatkan semua ayat dalam Hizb Quarter tertentu. Al-Quran dibagi menjadi 240 Hizb Quarter (60 Hizb × 4 quarters).`,
      request: {
        params: z.object({
          number: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(240),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Daftar Ayat dalam Hizb Quarter",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: z.array(ayahSchema.extend({
                  surah: z.object({
                    number: z.number(),
                    name: z.string(),
                    name_latin: z.string(),
                    number_of_ayahs: z.number(),
                    translation: z.string(),
                    revelation: z.string(),
                  }),
                })),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/hizb/1"),
    }),
    (c) => {
      const { number } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const { data, total } = quranService.getAyahsByHizb(number, page, limit);
      const formattedData = data.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));
      return c.json({ status: true, data: formattedData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/:surah - Get specific surah details (with or without ayahs could be option, here maybe just info or list)
  // To keep it simple, let's return surah info + list of ayahs if requested?
  // Standard practice often: /quran/:id returns surah info. /quran/:id/ayahs returns ayahs.
  // Let's make /quran/:surah return surah info + all ayahs for convenience as requested in plan.

  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/{surah}",
      tags: ["Quran"],
      summary: "Ayat per Surat",
      description: `Ayat per Surat adalah informasi lengkap mengenai surat tertentu dalam Al-Quran, termasuk semua ayat yang terkandung di dalamnya.`,
      request: {
        params: z.object({
          surah: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(114),
          ),
        }),
        query: paginationQuerySchema,
      },
      responses: {
        200: {
          description: "Detail Surat dan Ayat",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: surahSchema.extend({
                  ayahs: z.array(ayahSchema),
                }),
                pagination: paginationMetaSchema,
              }),
            },
          },
        },
        404: {
          description: "Surah not found",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                message: z.string(),
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/1"),
    }),
    (c) => {
      const { surah } = c.req.valid("param");
      const { page, limit } = c.req.valid("query");
      const surahData = quranService.getSurah(surah);
      if (!surahData) {
        return c.json({ status: false, message: "Surah not found" }, 404);
      }

      const { data: ayahsData, total } = quranService.getAyahs(surah, page, limit);
      const formattedAyahs = ayahsData.map((a) => ({
        id: a.id,
        surah_number: a.surah_number,
        ayah_number: a.ayah_number,
        arab: a.arab,
        translation: a.translation,
        audio_url: a.audio_url,
        image_url: a.image_url,
        tafsir: {
          kemenag: {
            short: a.tafsir_kemenag_short,
            long: a.tafsir_kemenag_long,
          },
          quraish: a.tafsir_quraish,
          jalalayn: a.tafsir_jalalayn,
        },
        meta: {
          juz: a.meta_juz,
          page: a.meta_page,
          manzil: a.meta_manzil,
          ruku: a.meta_ruku,
          hizb_quarter: a.meta_hizb_quarter,
          sajda: {
            recommended: a.meta_sajda_recommended,
            obligatory: a.meta_sajda_obligatory,
          },
        },
      }));

      const responseData = {
        ...surahData,
        ayahs: formattedAyahs,
      };

      return c.json({ status: true, data: responseData, pagination: { page, limit, total } }, 200);
    },
  );

  // GET /quran/:surah/:ayah - Get specific ayah
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/{surah}/{ayah}",
      tags: ["Quran"],
      summary: "Detail Ayat",
      description: `Detail ayat adalah informasi lengkap mengenai ayat tertentu dalam Al-Quran, termasuk semua ayat yang terkandung di dalamnya.`,
      request: {
        params: z.object({
          surah: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(114),
          ),
          ayah: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1),
          ),
        }),
      },
      responses: {
        200: {
          description: "Detail Ayat",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                data: ayahSchema,
              }),
            },
          },
        },
        404: {
          description: "Ayah not found",
          content: {
            "application/json": {
              schema: z.object({
                status: z.boolean(),
                message: z.string(),
              }),
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/quran/1/1"),
    }),
    (c) => {
      const { surah, ayah } = c.req.valid("param");
      const ayahData = quranService.getAyah(surah, ayah);

      if (!ayahData) {
        return c.json({ status: false, message: "Ayah not found" }, 404);
      }

      const formattedAyah = {
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
      };

      return c.json({ status: true, data: formattedAyah }, 200);
    },
  );

  // POST /quran/search - Search ayahs
  const searchRoute = createRoute({
    method: "post",
    path: "/quran/search",
    tags: ["Quran"],
    summary: "Pencarian Ayat",
    description: "Mencari ayat Al-Quran berdasarkan kata kunci.",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              keyword: z.string().min(3).openapi({ example: "pujian" }),
              page: z.number().int().min(1).default(1).openapi({ example: 1 }),
              limit: z.number().int().min(1).max(100).default(10).openapi({ example: 10 }),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Hasil Pencarian",
        content: {
          "application/json": {
            schema: z.object({
              status: z.boolean(),
              message: z.string(),
              data: z.array(ayahSchema.extend({
                surah: z.object({
                  number: z.number(),
                  name: z.string(),
                  name_latin: z.string(),
                  number_of_ayahs: z.number(),
                  translation: z.string(),
                  revelation: z.string(),
                }),
              })),
              pagination: paginationMetaSchema,
            }),
          },
        },
      },
      503: {
        description: "Service unavailable",
        content: {
          "application/json": {
            schema: z.object({
              status: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
      500: {
        description: "Internal Server Error",
        content: {
          "application/json": {
            schema: z.object({
              status: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "POST",
      "/quran/search",
      JSON.stringify({ keyword: "pujian", limit: 10 }),
    ),
  });

  app.openapi(searchRoute, async (c) => {
    if (!quranSearchService) {
      return c.json({ status: false, message: "Layanan pencarian belum tersedia" }, 503);
    }
    const { keyword, page, limit } = c.req.valid("json");
    try {
      const { total, hits } = await quranSearchService.search(keyword, page, limit);
      
      const formattedData = hits.map((ayahData) => ({
        id: ayahData.id,
        surah_number: ayahData.surah_number,
        ayah_number: ayahData.ayah_number,
        arab: ayahData.arab,
        translation: ayahData.translation,
        audio_url: ayahData.audio_url,
        image_url: ayahData.image_url,
        tafsir: {
          kemenag: {
            short: ayahData.tafsir_kemenag_short,
            long: ayahData.tafsir_kemenag_long,
          },
          quraish: ayahData.tafsir_quraish,
          jalalayn: ayahData.tafsir_jalalayn,
        },
        meta: {
          juz: ayahData.meta_juz,
          page: ayahData.meta_page,
          manzil: ayahData.meta_manzil,
          ruku: ayahData.meta_ruku,
          hizb_quarter: ayahData.meta_hizb_quarter,
          sajda: {
            recommended: ayahData.meta_sajda_recommended,
            obligatory: ayahData.meta_sajda_obligatory,
          },
        },
        surah: ayahData.surah,
      }));

      return c.json({
        status: true,
        message: "success",
        data: formattedData,
        pagination: { page, limit, total },
      }, 200);
    } catch (error) {
      console.error(error);
      return c.json({ status: false, message: "Gagal memproses pencarian" }, 500);
    }
  });
};
