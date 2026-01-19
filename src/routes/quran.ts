import type { App, AppEnv } from "~/types.ts";
import type { QuranService } from "~/services/quran.ts";
import { createRoute, z } from "@hono/zod-openapi";

export type RegisterQuranRoutesOptions = {
  app: App;
  docBaseUrl: string;
  quranService: QuranService;
};

export const registerQuranRoutes = ({
  app,
  docBaseUrl,
  quranService,
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

  // GET /quran - List all surahs
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran",
      tags: ["Quran"],
      summary: "Daftar Surat",
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
      return c.json({ status: true, data });
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
      summary: "Detail Surat dan Ayat",
      request: {
        params: z.object({
          surah: z.string().transform((v) => parseInt(v, 10)).pipe(
            z.number().min(1).max(114),
          ),
        }),
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
    }),
    (c) => {
      const { surah } = c.req.valid("param");
      const surahData = quranService.getSurah(surah);
      if (!surahData) {
        return c.json({ status: false, message: "Surah not found" }, 404);
      }

      const ayahsData = quranService.getAyahs(surah);
      const formattedAyahs = ayahsData.map((a) => ({
        id: a.id,
        surah_number: a.surah_number,
        ayah_number: a.ayah_number,
        arab: a.arab,
        translation: a.translation,
        audio_url: a.audio_url,
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

      return c.json({
        status: true,
        data: { ...surahData, ayahs: formattedAyahs },
      });
    },
  );

  // GET /quran/:surah/:ayah - Get specific ayah
  app.openapi(
    createRoute({
      method: "get",
      path: "/quran/{surah}/{ayah}",
      tags: ["Quran"],
      summary: "Detail Ayat",
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

      return c.json({ status: true, data: formattedAyah });
    },
  );
};
