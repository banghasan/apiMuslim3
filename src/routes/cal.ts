import type { Context } from "hono";
import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  buildCeInfo,
  buildHijriInfo,
  CalendarMethod,
  convertHijriToGregorian,
  createZonedDate,
  DateInfo,
  getGregorianParts,
  parseAdjustment,
  parseCalendarMethod,
  parseGregorianDate,
  parseHijriDate,
  safeCalendarTimeZone,
  shiftZonedDate,
} from "~/lib/calendar.ts";
import { buildCodeSamples } from "~/lib/docs.ts";
import type { AppEnv } from "~/types.ts";

const calendarMethodEnum = z
  .enum(["standar", "islamic-umalqura", "islamic-civil"])
  .openapi({
    description: "Metode perhitungan kalender.",
    example: "standar",
  });

const dateInfoSchema = z
  .object({
    today: z.string().openapi({ example: "Senin, 24 November 2025" }),
    day: z.number().int().openapi({ example: 24 }),
    dayName: z.string().openapi({ example: "Senin" }),
    month: z.number().int().openapi({ example: 11 }),
    monthName: z.string().openapi({ example: "November" }),
    year: z.number().int().openapi({ example: 2025 }),
  })
  .openapi("CalendarDateInfo");

const calendarDataSchema = z
  .object({
    method: calendarMethodEnum,
    adjustment: z.number().int().openapi({ example: 0 }),
    ce: dateInfoSchema,
    hijr: dateInfoSchema,
  })
  .openapi("CalendarData");

const calendarSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: calendarDataSchema,
  })
  .openapi("CalendarSuccess");

const calendarErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({
      example: "Format tanggal Masehi tidak valid. Gunakan YYYY-MM-DD.",
    }),
  })
  .openapi("CalendarError");

const calendarQuerySchema = z.object({
  adj: z
    .string()
    .openapi({
      example: "1",
      description: "Penyesuaian hari. Nilai negatif untuk mundur.",
    })
    .optional(),
  method: z
    .string()
    .openapi({
      example: "islamic-umalqura",
      description: "Metode kalender, alias `m` tersedia.",
    })
    .optional(),
  m: z
    .string()
    .openapi({
      example: "standar",
      description: "Alias singkat untuk parameter `method`.",
    })
    .optional(),
  utc: z
    .string()
    .openapi({
      example: "Asia/Jakarta",
      description: "Zona waktu IANA. Alias `tz` tersedia.",
    })
    .optional(),
  tz: z
    .string()
    .openapi({
      example: "Asia/Makassar",
      description: "Alias dari parameter `utc`.",
    })
    .optional(),
});

const successResponse = (data: {
  method: CalendarMethod;
  adjustment: number;
  ce: DateInfo;
  hijr: DateInfo;
}) => ({
  status: true as const,
  message: "success",
  data,
});

const errorResponse = (message: string) => ({
  status: false as const,
  message,
});

type CalendarQueryInput = {
  adj?: string;
  method?: string;
  m?: string;
  utc?: string;
  tz?: string;
};

const getCommonParams = (query: CalendarQueryInput = {}) => {
  const selection = parseCalendarMethod(query.method ?? query.m);
  const timeZone = safeCalendarTimeZone(query.utc ?? query.tz);
  const adjustment = parseAdjustment(query.adj);
  return { selection, timeZone, adjustment };
};

const readQueryFromContext = (c: Context<AppEnv>): CalendarQueryInput => ({
  adj: c.req.query("adj") ?? undefined,
  method: c.req.query("method") ?? undefined,
  m: c.req.query("m") ?? undefined,
  utc: c.req.query("utc") ?? undefined,
  tz: c.req.query("tz") ?? undefined,
});

export const registerCalRoutes = (
  app: OpenAPIHono<AppEnv>,
  docBaseUrl: string,
) => {
  const sampleHijrDate = "2024-05-10";
  const sampleCeHijr = "1445-11-02";
  const calendarMethodParam = "method=islamic-umalqura";
  const ceAliases = [
    "/cal/masehi/{date}",
    "/cal/ad/{date}",
    "/cal/syamsiah/{date}",
    "/cal/julian/{date}",
  ];
  const ceAliasDescription = `\nAlias:\n${ceAliases
    .map((alias) => ` - \`${alias}\``)
    .join("\n")}`;
  const toHonoPath = (path: string) => path.replace(/\{([^}]+)\}/g, ":$1");
  const registerAliasRoutes = (
    aliases: string[],
    handler: (c: Context<AppEnv>) => Promise<Response> | Response,
  ) => {
    for (const alias of aliases) {
      app.get(toHonoPath(alias), handler);
    }
  };
  const todayRoute = createRoute({
    method: "get",
    path: "/cal/today",
    summary: "Kalender Hari Ini",
    description:
      "Menampilkan tanggal hari ini dalam kalender Masehi (CE) dan Hijriyah secara bersamaan. Parameter `adj` hanya mempengaruhi bagian Hijriyah.",
    tags: ["Kalender"],
    request: {
      query: calendarQuerySchema,
    },
    responses: {
      200: {
        description: "Kalender berhasil dibuat.",
        content: {
          "application/json": {
            schema: calendarSuccessSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      "/cal/today?adj=0&tz=Asia%2FJakarta",
    ),
  });

  const hijrRoute = createRoute({
    method: "get",
    path: "/cal/hijr/{date}",
    summary: "Masehi ke Hijriyah",
    description:
      "Konversi tanggal Masehi (`YYYY-MM-DD`) ke Hijriyah. Parameter `adj` hanya mempengaruhi tanggal Hijriyah.",
    tags: ["Kalender"],
    request: {
      params: z.object({
        date: z.string().openapi({
          example: "2024-05-10",
          description: "Tanggal Masehi yang akan dikonversi (`YYYY-MM-DD`).",
        }),
      }),
      query: calendarQuerySchema,
    },
    responses: {
      200: {
        description: "Konversi berhasil.",
        content: {
          "application/json": {
            schema: calendarSuccessSchema,
          },
        },
      },
      400: {
        description: "Format tanggal tidak valid.",
        content: {
          "application/json": {
            schema: calendarErrorSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      `/cal/hijr/${sampleHijrDate}?${calendarMethodParam}`,
    ),
  });

  const ceRoute = createRoute({
    method: "get",
    path: "/cal/ce/{date}",
    summary: "Hijriyah ke Masehi",
    description: `Konversi tanggal Hijriyah (\`YYYY-MM-DD\`) ke kalender Masehi. Parameter \`adj\` hanya mempengaruhi tanggal Masehi.${ceAliasDescription}`,
    tags: ["Kalender"],
    request: {
      params: z.object({
        date: z.string().openapi({
          example: "1445-11-02",
          description: "Tanggal Hijriyah yang akan dikonversi (`YYYY-MM-DD`).",
        }),
      }),
      query: calendarQuerySchema,
    },
    responses: {
      200: {
        description: "Konversi berhasil.",
        content: {
          "application/json": {
            schema: calendarSuccessSchema,
          },
        },
      },
      400: {
        description: "Format tanggal tidak valid atau gagal dikonversi.",
        content: {
          "application/json": {
            schema: calendarErrorSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      `/cal/ce/${sampleCeHijr}?${calendarMethodParam}`,
    ),
  });

  const respondCeConversion = (
    c: Context<AppEnv>,
    rawDate: string,
    query: CalendarQueryInput,
  ) => {
    const hijriDate = parseHijriDate(rawDate);
    if (!hijriDate) {
      return c.json(
        errorResponse(
          "Format tanggal hijriyah tidak valid. Gunakan YYYY-MM-DD.",
        ),
        400,
      );
    }
    const { selection, timeZone, adjustment } = getCommonParams(query);
    const baseDate = convertHijriToGregorian(
      hijriDate,
      selection.calendar,
      timeZone,
    );
    if (!baseDate) {
      return c.json(
        errorResponse(
          "Gagal mengkonversi tanggal hijriyah ke kalender Masehi untuk metode ini.",
        ),
        400,
      );
    }
    const ceDate = shiftZonedDate(baseDate, adjustment, timeZone);
    const ce = buildCeInfo(ceDate, timeZone);
    const hijr = buildHijriInfo(baseDate, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  };

  app.openapi(todayRoute, (c) => {
    const query = c.req.valid("query");
    const { selection, timeZone, adjustment } = getCommonParams(query);
    const now = new Date();
    const todayParts = getGregorianParts(now, timeZone);
    const todayDate = createZonedDate(todayParts, timeZone);
    const adjustedHijr = shiftZonedDate(todayDate, adjustment, timeZone);
    const ce = buildCeInfo(todayDate, timeZone);
    const hijr = buildHijriInfo(adjustedHijr, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  });

  app.openapi(hijrRoute, (c) => {
    const { date } = c.req.valid("param");
    const query = c.req.valid("query");
    const ceDate = parseGregorianDate(date);
    if (!ceDate) {
      return c.json(
        errorResponse("Format tanggal Masehi tidak valid. Gunakan YYYY-MM-DD."),
        400,
      );
    }
    const { selection, timeZone, adjustment } = getCommonParams(query);
    const baseDate = createZonedDate(ceDate, timeZone);
    const hijrDate = shiftZonedDate(baseDate, adjustment, timeZone);
    const ce = buildCeInfo(baseDate, timeZone);
    const hijr = buildHijriInfo(hijrDate, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  });

  app.openapi(ceRoute, (c) => {
    const { date } = c.req.valid("param");
    const query = c.req.valid("query");
    return respondCeConversion(c, date, query);
  });
  registerAliasRoutes(ceAliases, (c) =>
    respondCeConversion(c, c.req.param("date") ?? "", readQueryFromContext(c)),
  );
};
