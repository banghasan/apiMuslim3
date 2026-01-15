import type { Context } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";
import type { JadwalResponseData, JadwalService } from "~/services/jadwal.ts";
import { parseSchedulePeriod } from "~/services/jadwal.ts";
import type { Location, SholatService } from "~/services/sholat.ts";
import type { AppEnv } from "~/types.ts";
import { sholatConfig } from "~/config/sholat.ts";
import {
  getCurrentHijriYear,
  getRamadanMonthsForCeYear,
  convertRamadanHijriToCe,
  parseCalendarMethod,
} from "~/lib/calendar.ts";

const locationSchema = z
  .object({
    id: z.string().openapi({ example: "eda80a3d5b344bc40f3bc04f65b7a357" }),
    lokasi: z.string().openapi({ example: "KOTA KEDIRI" }),
  })
  .openapi("Location");

const successSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: z.array(locationSchema),
  })
  .openapi("SholatResponse");

const jadwalEntrySchema = z
  .object({
    tanggal: z.string().openapi({ example: "Selasa, 23/06/2026" }),
    imsak: z.string().openapi({ example: "04:13" }),
    subuh: z.string().openapi({ example: "04:23" }),
    terbit: z.string().openapi({ example: "05:41" }),
    dhuha: z.string().openapi({ example: "06:10" }),
    dzuhur: z.string().openapi({ example: "11:38" }),
    ashar: z.string().openapi({ example: "14:57" }),
    maghrib: z.string().openapi({ example: "17:27" }),
    isya: z.string().openapi({ example: "18:42" }),
  })
  .openapi("JadwalEntry");

const jadwalDataSchema = z
  .object({
    id: z.string().openapi({ example: "eda80a3d5b344bc40f3bc04f65b7a357" }),
    kabko: z.string().openapi({ example: "KOTA KEDIRI" }),
    prov: z.string().openapi({ example: "JAWA TIMUR" }),
    jadwal: z.record(z.string(), jadwalEntrySchema).openapi({
      example: {
        "2026-06-23": {
          tanggal: "Selasa, 23/06/2026",
          imsak: "04:13",
          subuh: "04:23",
          terbit: "05:41",
          dhuha: "06:10",
          dzuhur: "11:38",
          ashar: "14:57",
          maghrib: "17:27",
          isya: "18:42",
        },
      },
    }),
  })
  .openapi("JadwalData");

const jadwalSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: jadwalDataSchema,
  })
  .openapi("JadwalResponse");

const errorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Data tidak ditemukan." }),
  })
  .openapi("ErrorResponse");

const sholatInfoSchema = z
  .object({
    name: z.string().openapi({ example: "Jadwal Sholat" }),
    desc: z.string().openapi({
      example: "API jadwal Sholat bersumber dari Kementrian Agama Indonesia",
    }),
    lang: z.string().openapi({ example: "Indonesia" }),
    last_update: z.string().openapi({ example: "25 November 2025" }),
    source: z.string().openapi({ example: "bimasislam.kemenag.go.id" }),
  })
  .openapi("SholatInfo");

const sholatInfoResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: sholatInfoSchema,
  })
  .openapi("SholatInfoResponse");

const successResponse = (data: Location[]) => ({
  status: true as const,
  message: "success",
  data,
});

const successJadwalResponse = (data: JadwalResponseData) => ({
  status: true as const,
  message: "success",
  data,
});

const errorResponse = (message = "Data tidak ditemukan.") => ({
  status: false as const,
  message,
});

const normalizeKeyword = (value: string) => {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return { ok: false as const, message: "keyword is required" };
  }
  if (!/^[a-zA-Z]/.test(collapsed)) {
    return { ok: false as const, message: "Keyword harus diawali huruf." };
  }
  const replaced = collapsed.replace(/\bkabupaten\b/gi, "kab.");
  const letterCount = replaced.replace(/[^a-zA-Z]/g, "").length;
  if (letterCount < 3) {
    return { ok: false as const, message: "Keyword minimal 3 huruf." };
  }
  return { ok: true as const, value: replaced.toLowerCase() };
};

type SholatRouteDeps = {
  sholatService: SholatService;
  jadwalService: JadwalService;
  docBaseUrl: string;
};

export const registerSholatRoutes = (
  app: OpenAPIHono<AppEnv>,
  { sholatService, jadwalService, docBaseUrl }: SholatRouteDeps,
) => {
  const { safeJadwalTimeZone, getTodayPeriod, loadScheduleFile } =
    jadwalService;
  const sholatInfoRoute = createRoute({
    method: "get",
    path: "/sholat",
    summary: "Informasi Sholat",
    description:
      "Menampilkan metadata jadwal sholat nasional serta sumber data resmi Kementerian Agama RI.",
    tags: ["Sholat"],
    responses: {
      200: {
        description: "Informasi jadwal sholat tersedia.",
        content: { "application/json": { schema: sholatInfoResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/sholat"),
  });

  app.openapi(sholatInfoRoute, (c) => {
    const data = {
      name: "Jadwal Sholat",
      desc: "API jadwal Sholat bersumber dari Kementrian Agama Indonesia",
      lang: "Indonesia",
      last_update: sholatConfig.lastUpdate,
      source: "bimasislam.kemenag.go.id",
    };
    return c.json({ status: true, message: "success", data }, 200);
  });

  const allPath = "/sholat/kabkota/semua";
  const byIdPath = "/sholat/kabkota/{id}";
  const searchPath = "/sholat/kabkota/cari/{keyword}";
  const searchPostPath = "/sholat/kabkota/cari";
  const routeAliases: Record<string, string[]> = {
    [allPath]: [
      "/sholat/kabkota/all",
      "/sholat/kota/semua",
      "/sholat/kota/all",
    ],
    [byIdPath]: ["/sholat/kota/{id}"],
    [searchPath]: [
      "/sholat/kabkota/find/{keyword}",
      "/sholat/kota/cari/{keyword}",
      "/sholat/kota/find/{keyword}",
    ],
    [searchPostPath]: [
      "/sholat/kabkota/find",
      "/sholat/kota/cari",
      "/sholat/kota/find",
    ],
  };

  type RouteHandler = (c: Context<AppEnv>) => Promise<Response> | Response;
  type RouteMethod = "get" | "post";
  const toHonoPath = (path: string) => path.replace(/\{([^}]+)\}/g, ":$1");
  const registerAliasRoutes = (
    path: string,
    method: RouteMethod,
    handler: RouteHandler,
  ) => {
    const aliases = routeAliases[path] ?? [];
    for (const alias of aliases) {
      const honoPath = toHonoPath(alias);
      if (method === "post") {
        app.post(honoPath, handler);
      } else {
        app.get(honoPath, handler);
      }
    }
  };
  const aliasDescription = (path: string) => {
    const aliases = routeAliases[path];
    if (!aliases?.length) return "";
    const bullet = aliases.map((alias) => ` - \`${alias}\``).join("\n");
    return `\nAlias:\n${bullet}`;
  };

  const sampleId = "eda80a3d5b344bc40f3bc04f65b7a357";
  const sampleKeyword = "kediri";
  const samplePeriod = "2026-06-23";
  const searchBody = JSON.stringify({ keyword: sampleKeyword });

  const respondAllLocations = (c: Context<AppEnv>) =>
    c.json(successResponse(sholatService.getAllLocations()), 200);
  const respondById = (c: Context<AppEnv>, rawId: string) => {
    const id = rawId.trim();
    if (!id) {
      return c.json(errorResponse(), 404);
    }
    const location = sholatService.findById(id);
    if (!location) {
      return c.json(errorResponse(), 404);
    }
    return c.json(successResponse([location]), 200);
  };
  const respondSearch = (c: Context<AppEnv>, keyword: string) => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized.ok) {
      return c.json(errorResponse(normalized.message), 400);
    }
    const needle = normalized.value;
    const result = sholatService.searchLocations(needle);

    if (result.length === 0) {
      return c.json(errorResponse(), 404);
    }
    return c.json(successResponse(result), 200);
  };

  const jadwalPaths = ["/sholat/jadwal/{id}/{period}"];
  const jadwalTodayPaths = ["/sholat/jadwal/{id}/today"];

  const createAllRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Semua",
      description: `Daftar lengkap seluruh kabupaten/kota yang tersedia.${
        aliasDescription(path)
      }`,
      tags: ["Sholat"],
      responses: {
        200: {
          description: "Daftar kab/kota berhasil dimuat.",
          content: {
            "application/json": {
              schema: successSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "GET",
        "/sholat/kabkota/semua",
      ),
    });

  const createByIdRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Berdasar ID",
      description: `Mendapatkan kabupaten atau kota berdasarkan ID.${
        aliasDescription(path)
      }`,
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z.string().openapi({
            example: "eda80a3d5b344bc40f3bc04f65b7a357",
          }),
        }),
      },
      responses: {
        200: {
          description: "Data ditemukan.",
          content: {
            "application/json": {
              schema: successSchema,
            },
          },
        },
        404: {
          description: "Data tidak ditemukan.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "GET",
        `/sholat/kabkota/${sampleId}`,
      ),
    });

  const createSearchRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Pencarian",
      description: `Pencarian Kabupaten atau Kota berdasarkan kata kunci.${
        aliasDescription(path)
      }`,
      tags: ["Sholat"],
      request: {
        params: z.object({
          keyword: z.string().min(1).openapi({ example: "kediri" }),
        }),
      },
      responses: {
        200: {
          description: "Pencarian berhasil.",
          content: {
            "application/json": {
              schema: successSchema,
            },
          },
        },
        400: {
          description: "Keyword tidak valid.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
        404: {
          description: "Tidak ada data yang cocok.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "GET",
        `/sholat/kabkota/cari/${sampleKeyword}`,
      ),
    });

  const searchBodySchema = z.object({
    keyword: z.string().min(1).openapi({ example: "kediri" }),
  });

  const createSearchPostRoute = (path: string) =>
    createRoute({
      method: "post",
      path,
      summary: "Kab/kota Pencarian (POST)",
      description: `Pencarian Kabupaten atau Kota melalui body JSON.${
        aliasDescription(path)
      }`,
      tags: ["Sholat"],
      request: {
        body: {
          content: {
            "application/json": {
              schema: searchBodySchema,
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Pencarian berhasil.",
          content: {
            "application/json": {
              schema: successSchema,
            },
          },
        },
        400: {
          description: "Keyword tidak valid.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
        404: {
          description: "Tidak ada data yang cocok.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "POST",
        "/sholat/kabkota/cari",
        searchBody,
      ),
    });

  const createJadwalRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Jadwal Sholat",
      description:
        "Jadwal sholat harian (`YYYY-MM-DD`) atau bulanan (`YYYY-MM`) berdasarkan ID kab/kota.",
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z.string().openapi({
            example: "eda80a3d5b344bc40f3bc04f65b7a357",
          }),
          period: z.string().openapi({
            example: "2026-06-23",
            description:
              "Gunakan format `YYYY-MM` untuk bulanan atau `YYYY-MM-DD` untuk harian.",
          }),
        }),
      },
      responses: {
        200: {
          description: "Jadwal ditemukan.",
          content: {
            "application/json": {
              schema: jadwalSuccessSchema,
            },
          },
        },
        400: {
          description: "Format tanggal tidak valid.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
        404: {
          description: "Data tidak ditemukan.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "GET",
        `/sholat/jadwal/${sampleId}/${samplePeriod}`,
      ),
    });

  const jadwalTodayQuerySchema = z.object({
    tz: z
      .string()
      .openapi({
        example: "Asia/Jakarta",
        description: "Zona waktu perhitungan jadwal. Default Asia/Jakarta.",
      })
      .optional(),
    utc: z
      .string()
      .openapi({
        example: "Asia/Makassar",
        description: "Alias parameter zona waktu.",
      })
      .optional(),
  });

  const createJadwalTodayRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "❤️ Jadwal Sholat Hari Ini",
      description:
        "Menampilkan jadwal sholat kab/kota untuk tanggal hari ini berdasarkan zona waktu pilihan.",
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z.string().openapi({
            example: "58a2fc6ed39fd083f55d4182bf88826d",
          }),
        }),
        query: jadwalTodayQuerySchema,
      },
      responses: {
        200: {
          description: "Jadwal hari ini berhasil ditemukan.",
          content: {
            "application/json": {
              schema: jadwalSuccessSchema,
            },
          },
        },
        404: {
          description: "Data tidak ditemukan untuk hari ini.",
          content: {
            "application/json": {
              schema: errorSchema,
            },
          },
        },
      },
      "x-codeSamples": buildCodeSamples(
        docBaseUrl,
        "GET",
        `/sholat/jadwal/${sampleId}/today?tz=Asia%2FJakarta`,
      ),
    });

  app.openapi(createAllRoute(allPath), respondAllLocations);
  registerAliasRoutes(allPath, "get", respondAllLocations);

  app.openapi(createByIdRoute(byIdPath), (c) => {
    const { id } = c.req.valid("param");
    return respondById(c, id);
  });
  registerAliasRoutes(
    byIdPath,
    "get",
    (c) => respondById(c, c.req.param("id") ?? ""),
  );

  app.openapi(createSearchRoute(searchPath), (c) => {
    const { keyword } = c.req.valid("param");
    return respondSearch(c, keyword);
  });
  registerAliasRoutes(
    searchPath,
    "get",
    (c) => respondSearch(c, c.req.param("keyword") ?? ""),
  );

  app.openapi(createSearchPostRoute(searchPostPath), (c) => {
    const { keyword } = c.req.valid("json");
    return respondSearch(c, keyword);
  });
  registerAliasRoutes(searchPostPath, "post", async (c) => {
    let keyword = "";
    try {
      const body = await c.req.json();
      if (body && typeof body.keyword === "string") {
        keyword = body.keyword;
      }
    } catch {
      keyword = "";
    }
    return respondSearch(c, keyword);
  });

  for (const path of jadwalTodayPaths) {
    app.openapi(createJadwalTodayRoute(path), async (c) => {
      const { id } = c.req.valid("param");
      const { tz, utc } = c.req.valid("query");
      const timeZone = safeJadwalTimeZone(utc ?? tz);
      const today = getTodayPeriod(timeZone);
      const monthlyData = await loadScheduleFile(id, today.year, today.month);
      if (!monthlyData) {
        return c.json(errorResponse(), 404);
      }
      const entry = monthlyData.jadwal[today.key];
      if (!entry) {
        return c.json(errorResponse(), 404);
      }
      return c.json(
        successJadwalResponse({
          ...monthlyData,
          jadwal: { [today.key]: entry },
        }),
        200,
      );
    });
  }

  for (const path of jadwalPaths) {
    app.openapi(createJadwalRoute(path), async (c) => {
      const { id, period } = c.req.valid("param");
      const parsedPeriod = parseSchedulePeriod(period);
      if (!parsedPeriod) {
        return c.json(
          errorResponse("Format tanggal harus YYYY-MM atau YYYY-MM-DD."),
          400,
        );
      }

      const monthlyData = await loadScheduleFile(
        id,
        parsedPeriod.year,
        parsedPeriod.month,
      );
      if (!monthlyData) {
        return c.json(errorResponse(), 404);
      }

      if (parsedPeriod.type === "daily") {
        const key =
          `${parsedPeriod.year}-${parsedPeriod.month}-${parsedPeriod.day}`;
        const entry = monthlyData.jadwal[key];
        if (!entry) {
          return c.json(errorResponse(), 404);
        }
        return c.json(
          successJadwalResponse({
            ...monthlyData,
            jadwal: { [key]: entry },
          }),
          200,
        );
      }

      return c.json(successJadwalResponse(monthlyData), 200);
    });
  }

  // Imsakiyah (Ramadan) Routes
  const imsakiyahDefaultRoute = createRoute({
    method: "get",
    path: "/sholat/imsakiyah/{id}",
    summary: "❤️ Imsakiyah Ramadhan",
    description:
      "Menampilkan jadwal imsakiyah (sholat) untuk bulan Ramadhan tahun ini. Ramadhan adalah bulan ke-9 dalam kalender Hijriah.",
    tags: ["Sholat"],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "eda80a3d5b344bc40f3bc04f65b7a357",
          description: "ID kabupaten/kota",
        }),
      }),
      query: z.object({
        method: z
          .string()
          .openapi({
            example: "islamic-umalqura",
            description: "Metode kalender Hijriah untuk perhitungan tahun",
          })
          .optional(),
      }),
    },
    responses: {
      200: {
        description: "Jadwal Ramadhan berhasil ditemukan.",
        content: {
          "application/json": {
            schema: jadwalSuccessSchema,
          },
        },
      },
      404: {
        description: "Data tidak ditemukan.",
        content: {
          "application/json": {
            schema: errorSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      `/sholat/imsakiyah/${sampleId}`,
    ),
  });

  const imsakiyahCeRoute = createRoute({
    method: "get",
    path: "/sholat/imsakiyah/{id}/ce/{year}",
    summary: "Imsakiyah (Masehi)",
    description:
      "Menampilkan jadwal imsakiyah untuk bulan Ramadhan berdasarkan tahun Masehi (CE). Karena kalender Hijriah berbeda dengan Masehi, Ramadhan bisa jatuh di berbagai bulan dalam tahun Masehi.",
    tags: ["Sholat"],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "eda80a3d5b344bc40f3bc04f65b7a357",
          description: "ID kabupaten/kota",
        }),
        year: z.string().regex(/^\d{4}$/).openapi({
          example: "2026",
          description: "Tahun Masehi (CE) dalam format YYYY",
        }),
      }),
      query: z.object({
        method: z
          .string()
          .openapi({
            example: "islamic-umalqura",
            description: "Metode kalender Hijriah",
          })
          .optional(),
      }),
    },
    responses: {
      200: {
        description: "Jadwal Ramadhan berhasil ditemukan.",
        content: {
          "application/json": {
            schema: jadwalSuccessSchema,
          },
        },
      },
      404: {
        description: "Data tidak ditemukan.",
        content: {
          "application/json": {
            schema: errorSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      `/sholat/imsakiyah/${sampleId}/ce/2026`,
    ),
  });

  const imsakiyahHijrRoute = createRoute({
    method: "get",
    path: "/sholat/imsakiyah/{id}/hijr/{year}",
    summary: "Imsakiyah (Hijriah)",
    description:
      "Menampilkan jadwal imsakiyah untuk bulan Ramadhan berdasarkan tahun Hijriah. Ramadhan adalah bulan ke-9 dalam kalender Hijriah.",
    tags: ["Sholat"],
    request: {
      params: z.object({
        id: z.string().openapi({
          example: "eda80a3d5b344bc40f3bc04f65b7a357",
          description: "ID kabupaten/kota",
        }),
        year: z.string().regex(/^\d{4}$/).openapi({
          example: "1447",
          description: "Tahun Hijriah dalam format YYYY",
        }),
      }),
      query: z.object({
        method: z
          .string()
          .openapi({
            example: "islamic-umalqura",
            description: "Metode kalender Hijriah",
          })
          .optional(),
      }),
    },
    responses: {
      200: {
        description: "Jadwal Ramadhan berhasil ditemukan.",
        content: {
          "application/json": {
            schema: jadwalSuccessSchema,
          },
        },
      },
      404: {
        description: "Data tidak ditemukan.",
        content: {
          "application/json": {
            schema: errorSchema,
          },
        },
      },
    },
    "x-codeSamples": buildCodeSamples(
      docBaseUrl,
      "GET",
      `/sholat/imsakiyah/${sampleId}/hijr/1447`,
    ),
  });

  // Handler for Imsakiyah default (current year)
  app.openapi(imsakiyahDefaultRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { method } = c.req.valid("query");
    const selection = parseCalendarMethod(method);
    const timeZone = safeJadwalTimeZone();
    
    // Get current Hijri year
    const currentHijriYear = getCurrentHijriYear(timeZone, selection.calendar);
    
    // Convert to CE year/month for Ramadan
    const ramadanPeriod = convertRamadanHijriToCe(
      currentHijriYear,
      selection.calendar,
      timeZone,
    );
    
    if (!ramadanPeriod) {
      return c.json(
        errorResponse("Gagal menghitung periode Ramadhan untuk tahun ini."),
        404,
      );
    }
    
    const monthlyData = await loadScheduleFile(
      id,
      ramadanPeriod.year,
      ramadanPeriod.month,
    );
    
    if (!monthlyData) {
      return c.json(
        errorResponse(
          `Data jadwal tidak tersedia untuk Ramadhan ${currentHijriYear}H (${ramadanPeriod.year}-${ramadanPeriod.month}).`,
        ),
        404,
      );
    }
    
    return c.json(successJadwalResponse(monthlyData), 200);
  });

  // Handler for Imsakiyah with CE year
  app.openapi(imsakiyahCeRoute, async (c) => {
    const { id, year } = c.req.valid("param");
    const { method } = c.req.valid("query");
    const selection = parseCalendarMethod(method);
    const timeZone = safeJadwalTimeZone();
    const ceYear = Number(year);
    
    // Get Ramadan months in this CE year
    const ramadanMonths = getRamadanMonthsForCeYear(
      ceYear,
      selection.calendar,
      timeZone,
    );
    
    if (ramadanMonths.length === 0) {
      return c.json(
        errorResponse(`Tidak ada Ramadhan dalam tahun ${ceYear}.`),
        404,
      );
    }
    
    // Try to load the first Ramadan month found
    // (usually there's only one, but could be two in edge cases)
    for (const period of ramadanMonths) {
      const monthlyData = await loadScheduleFile(id, period.year, period.month);
      if (monthlyData) {
        return c.json(successJadwalResponse(monthlyData), 200);
      }
    }
    
    return c.json(
      errorResponse(
        `Data jadwal tidak tersedia untuk Ramadhan dalam tahun ${ceYear}.`,
      ),
      404,
    );
  });

  // Handler for Imsakiyah with Hijri year
  app.openapi(imsakiyahHijrRoute, async (c) => {
    const { id, year } = c.req.valid("param");
    const { method } = c.req.valid("query");
    const selection = parseCalendarMethod(method);
    const timeZone = safeJadwalTimeZone();
    const hijriYear = Number(year);
    
    // Convert Hijri year to CE year/month for Ramadan
    const ramadanPeriod = convertRamadanHijriToCe(
      hijriYear,
      selection.calendar,
      timeZone,
    );
    
    if (!ramadanPeriod) {
      return c.json(
        errorResponse(`Gagal mengkonversi tahun Hijriah ${hijriYear}.`),
        404,
      );
    }
    
    const monthlyData = await loadScheduleFile(
      id,
      ramadanPeriod.year,
      ramadanPeriod.month,
    );
    
    if (!monthlyData) {
      return c.json(
        errorResponse(
          `Data jadwal tidak tersedia untuk Ramadhan ${hijriYear}H (${ramadanPeriod.year}-${ramadanPeriod.month}).`,
        ),
        404,
      );
    }
    
    return c.json(successJadwalResponse(monthlyData), 200);
  });
};
