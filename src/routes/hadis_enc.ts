import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";
import type { HadisEncExploreResult, HadisEncService } from "~/services/hadis_enc.ts";
import type { AppEnv } from "~/types.ts";
import { hadisEncConfig } from "~/config/hadis_enc.ts";

type RegisterHadisEncDeps = {
  app: OpenAPIHono<AppEnv>;
  hadisEncService: HadisEncService;
  docBaseUrl: string;
};

const hadisEncTextSchema = z
  .object({
    ar: z.string().openapi({
      example: "الْحَدِيثُ بِلُغَتِهِ الْعَرَبِيَّةِ",
      description: "Matn hadis bahasa Arab.",
    }),
    id: z.string().openapi({
      example: "Hadis dalam terjemahan bahasa Indonesia.",
      description: "Terjemah hadis bahasa Indonesia.",
    }),
  })
  .openapi("HadisEncText");

const hadisEncDetailSchema = z
  .object({
    id: z.number().int().openapi({ example: 2750 }),
    text: hadisEncTextSchema,
    grade: z.string().nullable().openapi({ example: "Shahih" }),
    takhrij: z.string().nullable().openapi({
      example: "HR. Bukhari dan Muslim",
    }),
    hikmah: z.string().nullable().openapi({
      example: "Pelajaran dan faedah dari hadis.",
    }),
    prev: z.number().int().nullable().openapi({ example: 2749 }),
    next: z.number().int().nullable().openapi({ example: 2751 }),
  })
  .openapi("HadisEncDetail");

const hadisEncListEntrySchema = hadisEncDetailSchema
  .omit({
    prev: true,
    next: true,
  })
  .openapi("HadisEncEntry");

const pagingSchema = z
  .object({
    current: z.number().int().openapi({ example: 1 }),
    per_page: z.number().int().openapi({ example: 5 }),
    total_data: z.number().int().openapi({ example: 1234 }),
    total_pages: z.number().int().openapi({ example: 247 }),
    has_prev: z.boolean().openapi({ example: false }),
    has_next: z.boolean().openapi({ example: true }),
    next_page: z.number().int().nullable().openapi({ example: 2 }),
    prev_page: z.number().int().nullable().openapi({ example: null }),
    first_page: z.number().int().nullable().openapi({ example: 1 }),
    last_page: z.number().int().nullable().openapi({ example: 247 }),
  })
  .openapi("HadisEncPaging");

const hadisDetailResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: hadisEncDetailSchema,
  })
  .openapi("HadisEncDetailResponse");

const hadisExploreResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: z
      .object({
        paging: pagingSchema,
        hadis: z.array(hadisEncListEntrySchema),
      })
      .openapi("HadisEncExploreData"),
  })
  .openapi("HadisEncExploreResponse");

const hadisErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Hadis tidak ditemukan." }),
  })
  .openapi("HadisEncError");

const exploreQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .openapi({ example: 2, description: "Nomor halaman (mulai dari 1)." }),
  limit: z.coerce.number().int().min(1).max(10).default(5).openapi({
    example: 5,
    description: "Jumlah hadis per halaman. Maksimal 10.",
  }),
});

const parseHadisId = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const successResponse = <T>(data: T) => ({
  status: true as const,
  message: "success",
  data,
});

const errorResponse = (message: string) => ({
  status: false as const,
  message,
});

const hadisEncMetaSchema = z
  .object({
    name: z.string().openapi({
      example: "Ensiklopedia Hadis",
    }),
    desc: z.string().openapi({
      example: "Ensiklopedia Terjemahan Hadis-hadis Nabi",
    }),
    lang: z.string().openapi({ example: "Indonesia" }),
    ver: z.string().openapi({ example: "1.21.0" }),
    last_update: z.string().openapi({
      example: "2025-02-05",
      description: "Tanggal update terakhir (YYYY-MM-DD).",
    }),
    source: z.string().openapi({ example: "hadeethenc.com" }),
  })
  .openapi("HadisEncMeta");

const hadisEncMetaResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: hadisEncMetaSchema,
  })
  .openapi("HadisEncMetaResponse");

export const registerHadisEncRoutes = ({
  app,
  hadisEncService,
  docBaseUrl,
}: RegisterHadisEncDeps) => {
  const metaRoute = createRoute({
    method: "get",
    path: "/hadis/enc",
    summary: "Ensiklopedia Hadis",
    description: "Menampilkan informasi versi dan metadata Ensiklopedia Hadis.",
    tags: ["Hadis"],
    responses: {
      200: {
        description: "Informasi hadis tersedia.",
        content: { "application/json": { schema: hadisEncMetaResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc"),
  });

  app.openapi(metaRoute, (c) => {
    const data = {
      name: "Ensiklopedia Hadis",
      desc: "Ensiklopedia Terjemahan Hadis-hadis Nabi",
      lang: "Indonesia",
      ver: hadisEncConfig.version,
      last_update: hadisEncConfig.lastUpdate,
      source: "hadeethenc.com",
    };
    return c.json(successResponse(data), 200);
  });

  const showRoute = createRoute({
    method: "get",
    path: "/hadis/enc/show/{id}",
    summary: "Hadis ID",
    description:
      "Menampilkan detail hadis Ensiklopedia berdasarkan ID, beserta tautan ke hadis sebelumnya dan berikutnya.",
    tags: ["Hadis"],
    request: {
      params: z.object({
        id: z.string().openapi({ example: "2750" }),
      }),
    },
    responses: {
      200: {
        description: "Hadis ditemukan.",
        content: { "application/json": { schema: hadisDetailResponseSchema } },
      },
      400: {
        description: "ID hadis tidak valid.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
      404: {
        description: "Hadis tidak ditemukan.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc/show/2750"),
  });

  app.openapi(showRoute, (c) => {
    const { id: rawId } = c.req.valid("param");
    const id = parseHadisId(rawId);
    if (id === null) {
      return c.json(errorResponse("ID hadis tidak valid."), 400);
    }
    const detail = hadisEncService.getById(id);
    if (!detail) {
      return c.json(errorResponse("Hadis tidak ditemukan."), 404);
    }
    return c.json(successResponse(detail), 200);
  });

  const nextRoute = createRoute({
    method: "get",
    path: "/hadis/enc/next/{id}",
    summary: "Hadis Berikutnya",
    description: "Menampilkan hadis setelah ID tertentu berdasarkan urutan angka.",
    tags: ["Hadis"],
    request: {
      params: z.object({
        id: z.string().openapi({ example: "2750" }),
      }),
    },
    responses: {
      200: {
        description: "Hadis berikutnya ditemukan.",
        content: { "application/json": { schema: hadisDetailResponseSchema } },
      },
      400: {
        description: "ID hadis tidak valid.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
      404: {
        description: "Hadis berikutnya tidak tersedia.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc/next/2750"),
  });

  app.openapi(nextRoute, (c) => {
    const { id: rawId } = c.req.valid("param");
    const id = parseHadisId(rawId);
    if (id === null) {
      return c.json(errorResponse("ID hadis tidak valid."), 400);
    }
    const detail = hadisEncService.getNext(id);
    if (!detail) {
      return c.json(errorResponse("Hadis berikutnya tidak ditemukan."), 404);
    }
    return c.json(successResponse(detail), 200);
  });

  const prevRoute = createRoute({
    method: "get",
    path: "/hadis/enc/prev/{id}",
    summary: "Hadis Sebelumnya",
    description: "Menampilkan hadis sebelum ID tertentu berdasarkan urutan angka.",
    tags: ["Hadis"],
    request: {
      params: z.object({
        id: z.string().openapi({ example: "2750" }),
      }),
    },
    responses: {
      200: {
        description: "Hadis sebelumnya ditemukan.",
        content: { "application/json": { schema: hadisDetailResponseSchema } },
      },
      400: {
        description: "ID hadis tidak valid.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
      404: {
        description: "Hadis sebelumnya tidak tersedia.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc/prev/2750"),
  });

  app.openapi(prevRoute, (c) => {
    const { id: rawId } = c.req.valid("param");
    const id = parseHadisId(rawId);
    if (id === null) {
      return c.json(errorResponse("ID hadis tidak valid."), 400);
    }
    const detail = hadisEncService.getPrevious(id);
    if (!detail) {
      return c.json(errorResponse("Hadis sebelumnya tidak ditemukan."), 404);
    }
    return c.json(successResponse(detail), 200);
  });

  const randomRoute = createRoute({
    method: "get",
    path: "/hadis/enc/random",
    summary: "Hadis Acak",
    description: "Mengambil satu hadis secara acak dari Ensiklopedia.",
    tags: ["Hadis"],
    responses: {
      200: {
        description: "Hadis acak berhasil diambil.",
        content: { "application/json": { schema: hadisDetailResponseSchema } },
      },
      404: {
        description: "Data hadis tidak tersedia.",
        content: { "application/json": { schema: hadisErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc/random"),
  });

  app.openapi(randomRoute, (c) => {
    const detail = hadisEncService.getRandom();
    if (!detail) {
      return c.json(errorResponse("Data hadis tidak tersedia."), 404);
    }
    return c.json(successResponse(detail), 200);
  });

  const exploreRoute = createRoute({
    method: "get",
    path: "/hadis/enc/explore",
    summary: "Eksplorasi Hadis",
    description: "Menampilkan daftar hadis dengan dukungan pagination (limit maksimal 10).",
    tags: ["Hadis"],
    request: {
      query: exploreQuerySchema,
    },
    responses: {
      200: {
        description: "Daftar hadis tersedia.",
        content: { "application/json": { schema: hadisExploreResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/enc/explore?page=1&limit=5"),
  });

  app.openapi(exploreRoute, (c) => {
    const { page, limit } = c.req.valid("query");
    const data: HadisEncExploreResult = hadisEncService.explore(page, limit);
    return c.json(successResponse(data), 200);
  });
};
