import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";
import type {
  HadisPerawiService,
  PerawiBrowseResult,
} from "~/services/hadis_perawi.ts";
import type { AppEnv } from "~/types.ts";
import { hadisPerawiConfig } from "~/config/hadis_perawi.ts";

type RegisterHadisPerawiDeps = {
  app: OpenAPIHono<AppEnv>;
  hadisPerawiService: HadisPerawiService;
  docBaseUrl: string;
};

const perawiFieldSchema = z.object({
  id: z.number().int().openapi({ example: 101 }),
  name: z.string().nullable().openapi({ example: "Imam Bukhari" }),
  grade: z.string().nullable().openapi({ example: "Siqah" }),
  parents: z.string().nullable().openapi({ example: "Nama Orang Tua" }),
  spouse: z.string().nullable().openapi({ example: "Nama Pasangan" }),
  siblings: z.string().nullable().openapi({ example: "Nama Saudara" }),
  children: z.string().nullable().openapi({ example: "Nama Anak" }),
  birth_date_place: z.string().nullable().openapi({
    example: "13 Syawal 194 H, Bukhara",
  }),
  places_of_stay: z.string().nullable().openapi({ example: "Bukhara, Bagdad" }),
  death_date_place: z.string().nullable().openapi({
    example: "1 Jumadal Akhir 256 H, Khartank",
  }),
  teachers: z.string().nullable().openapi({ example: "Imam Malik" }),
  students: z.string().nullable().openapi({ example: "Imam Muslim" }),
  area_of_interest: z.string().nullable().openapi({ example: "Hadis" }),
  tags: z.string().nullable().openapi({ example: "Tabi'in" }),
  books: z.string().nullable().openapi({ example: "Shahih al-Bukhari" }),
  students_inds: z.string().nullable(),
  teachers_inds: z.string().nullable(),
  birth_place: z.string().nullable(),
  birth_date: z.string().nullable(),
  birth_date_hijri: z.string().nullable(),
  birth_date_gregorian: z.string().nullable(),
  death_date_hijri: z.string().nullable(),
  death_date_gregorian: z.string().nullable(),
  death_place: z.string().nullable(),
  death_reason: z.string().nullable(),
});

const perawiSummaryResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.literal("Daftar Semua Perawi").openapi({
      example: "Daftar Semua Perawi",
    }),
    data: z.object({
      total: z.number().int().openapi({ example: 1234 }),
      last_update: z.string().openapi({ example: "26 November 2025" }),
      sumber: z.string().openapi({
        example:
          "https://huggingface.co/datasets/Mahadih534/Islamic-Scholars-data",
      }),
    }),
  })
  .openapi("PerawiSummaryResponse");

const perawiDetailResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: perawiFieldSchema,
  })
  .openapi("PerawiDetailResponse");

const perawiErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Perawi tidak ditemukan." }),
  })
  .openapi("PerawiError");

const perawiBrowseResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: z.object({
      paging: z.object({
        current: z.number().int().openapi({ example: 1 }),
        per_page: z.number().int().openapi({ example: 10 }),
        total_data: z.number().int().openapi({ example: 2500 }),
        total_pages: z.number().int().openapi({ example: 250 }),
        has_prev: z.boolean().openapi({ example: false }),
        has_next: z.boolean().openapi({ example: true }),
        next_page: z.number().int().nullable().openapi({ example: 2 }),
        prev_page: z.number().int().nullable().openapi({ example: null }),
        first_page: z.number().int().nullable().openapi({ example: 1 }),
        last_page: z.number().int().nullable().openapi({ example: 250 }),
      }),
      rawi: z.array(perawiFieldSchema),
    }),
  })
  .openapi("PerawiBrowseResponse");

const browseQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .openapi({ example: 1, description: "Nomor halaman (mulai dari 1)." }),
  limit: z.coerce.number().int().min(1).max(20).default(10).openapi({
    example: 10,
    description: "Jumlah data per halaman (maksimal 20).",
  }),
});

const parsePerawiId = (raw: string): number | null => {
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const successResponse = <T>(data: T, message = "success") => ({
  status: true as const,
  message,
  data,
});

const errorResponse = (message: string) => ({
  status: false as const,
  message,
});

export const registerHadisPerawiRoutes = ({
  app,
  hadisPerawiService,
  docBaseUrl,
}: RegisterHadisPerawiDeps) => {
  const summaryRoute = createRoute({
    method: "get",
    path: "/hadis/perawi",
    summary: "Perawi",
    description:
      "Mengembalikan ringkasan jumlah keseluruhan perawi beserta metadata pembaruan data.",
    tags: ["Hadis"],
    responses: {
      200: {
        description: "Ringkasan data perawi.",
        content: {
          "application/json": { schema: perawiSummaryResponseSchema },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/hadis/perawi"),
  });

  app.openapi(summaryRoute, (c) => {
    const total = hadisPerawiService.getTotalCount();
    const data = {
      total,
      last_update: hadisPerawiConfig.lastUpdate,
      sumber: hadisPerawiConfig.sumber,
    };
    return c.json(successResponse(data, "Daftar Semua Perawi"), 200);
  });

  const detailRoute = createRoute({
    method: "get",
    path: "/hadist/perawi/id/{id}",
    summary: "Perawi Detail",
    description:
      "Menampilkan detail perawi dari database rawi berdasarkan `scholar_indx`.",
    tags: ["Hadis"],
    request: {
      params: z.object({
        id: z.string().openapi({ example: "101" }),
      }),
    },
    responses: {
      200: {
        description: "Data perawi ditemukan.",
        content: { "application/json": { schema: perawiDetailResponseSchema } },
      },
      400: {
        description: "ID tidak valid.",
        content: { "application/json": { schema: perawiErrorSchema } },
      },
      404: {
        description: "Perawi tidak ditemukan.",
        content: { "application/json": { schema: perawiErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      "/hadist/perawi/id/101",
    ),
  });

  app.openapi(detailRoute, (c) => {
    const { id: rawId } = c.req.valid("param");
    const id = parsePerawiId(rawId);
    if (id === null) {
      return c.json(errorResponse("ID perawi tidak valid."), 400);
    }
    const detail = hadisPerawiService.getById(id);
    if (!detail) {
      return c.json(errorResponse("Perawi tidak ditemukan."), 404);
    }
    return c.json(successResponse(detail), 200);
  });

  const browseRoute = createRoute({
    method: "get",
    path: "/hadist/perawi/browse",
    summary: "Perawi Data",
    description:
      "Menampilkan daftar perawi secara paginasi dengan batas maksimal 20 entri per halaman.",
    tags: ["Hadis"],
    request: {
      query: browseQuerySchema,
    },
    responses: {
      200: {
        description: "Daftar perawi tersedia.",
        content: { "application/json": { schema: perawiBrowseResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      "/hadist/perawi/browse?page=1&limit=10",
    ),
  });

  app.openapi(browseRoute, (c) => {
    const { page, limit } = c.req.valid("query");
    const data: PerawiBrowseResult = hadisPerawiService.browse(page, limit);
    return c.json(successResponse(data), 200);
  });
};
