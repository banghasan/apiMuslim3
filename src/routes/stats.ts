import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";
import type { StatsService } from "~/services/stats.ts";
import type { AppEnv } from "~/types.ts";

type RegisterStatsDeps = {
  app: OpenAPIHono<AppEnv>;
  statsService: StatsService;
  docBaseUrl: string;
};

const yearlyStatSchema = z
  .object({
    tahun: z.number().int().openapi({ example: 2025 }),
    hits: z.number().int().openapi({ example: 1200 }),
  })
  .openapi("YearlyStat");

const statsListResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: z.array(yearlyStatSchema),
  })
  .openapi("StatsListResponse");

const monthlyStatSchema = z
  .object({
    tahun: z.number().int().openapi({ example: 2025 }),
    bulan: z.number().int().min(1).max(12).openapi({ example: 11 }),
    hits: z.number().int().openapi({ example: 100 }),
  })
  .openapi("MonthlyStat");

const yearlyDetailSchema = z
  .object({
    avg: z.number().openapi({ example: 200 }),
    detail: z.array(monthlyStatSchema),
  })
  .openapi("StatsYearDetail");

const statsDetailResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: yearlyDetailSchema,
  })
  .openapi("StatsDetailResponse");

const statsErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Tahun tidak valid." }),
  })
  .openapi("StatsError");

export const registerStatsRoutes = (
  { app, statsService, docBaseUrl }: RegisterStatsDeps,
) => {
  const statsCurrentRoute = createRoute({
    method: "get",
    path: "/stats",
    summary: "Stats Terkini",
    description:
      "Menampilkan detail hits bulanan dan rata-rata untuk tahun berjalan.",
    tags: ["Stats"],
    responses: {
      200: {
        description: "Statistik tahun berjalan tersedia.",
        content: { "application/json": { schema: statsDetailResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/stats"),
  });

  app.openapi(statsCurrentRoute, (c) => {
    const year = new Date().getFullYear();
    const data = statsService.getYearDetail(year);
    return c.json({ status: true, message: "success", data });
  });

  const statsDetailRoute = createRoute({
    method: "get",
    path: "/stats/{year}",
    summary: "Stats Bulanan",
    description:
      "Menampilkan rinci hits bulanan untuk tahun tertentu beserta rata-rata per bulan.",
    tags: ["Stats"],
    request: {
      params: z.object({
        year: z.string().openapi({
          example: "2025",
          description: "Tahun yang ingin dicek",
        }),
      }),
    },
    responses: {
      200: {
        description: "Statistik tahunan tersedia.",
        content: { "application/json": { schema: statsDetailResponseSchema } },
      },
      400: {
        description: "Parameter tahun tidak valid.",
        content: { "application/json": { schema: statsErrorSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/stats/2025"),
  });

  app.openapi(statsDetailRoute, (c) => {
    const rawYear = c.req.param("year");
    const year = Number.parseInt(rawYear, 10);
    if (Number.isNaN(year)) {
      return c.json({ status: false, message: "Tahun tidak valid." }, 400);
    }
    const data = statsService.getYearDetail(year);
    return c.json({ status: true, message: "success", data });
  });

  const statsAllRoute = createRoute({
    method: "get",
    path: "/stats/all",
    summary: "Stats Tahunan",
    description:
      "Mengembalikan total hit grup berdasarkan tahun untuk seluruh API.",
    tags: ["Stats"],
    responses: {
      200: {
        description: "Statistik tersedia.",
        content: { "application/json": { schema: statsListResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/stats/all"),
  });

  app.openapi(statsAllRoute, (c) => {
    const data = statsService.getYearlyStats();
    return c.json({ status: true, message: "success", data });
  });
};
