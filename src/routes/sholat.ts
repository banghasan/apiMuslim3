import type { Context } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import {
  getTodayPeriod,
  JadwalEntry,
  JadwalResponseData,
  loadScheduleFile,
  parseSchedulePeriod,
  safeJadwalTimeZone,
} from "~/lib/jadwal.ts";
import type { AppEnv } from "~/types.ts";

export type RawEntry = {
  value: string;
  text: string;
};

export type KabKotaSource = {
  fetchedAt?: string;
  map?: Record<string, RawEntry[]>;
};

export type Location = {
  id: string;
  lokasi: string;
};

export type SholatData = {
  locations: Location[];
  idIndex: Map<string, Location>;
};

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

export const loadSholatData = async (): Promise<SholatData> => {
  const kabKotaFile = new URL(
    "../../data/sholat/kabkota.json",
    import.meta.url,
  );
  const parsedSource = JSON.parse(
    await Deno.readTextFile(kabKotaFile),
  ) as KabKotaSource;

  const locationMap = new Map<string, Location>();
  for (const group of Object.values(parsedSource.map ?? {})) {
    for (const entry of group ?? []) {
      if (!entry?.value || !entry?.text) continue;
      if (!locationMap.has(entry.value)) {
        locationMap.set(entry.value, {
          id: entry.value,
          lokasi: entry.text.trim(),
        });
      }
    }
  }

  const locations = Array.from(locationMap.values());
  const idIndex = new Map(locations.map((loc) => [loc.id, loc] as const));

  return { locations, idIndex };
};

export const registerSholatRoutes = (
  app: OpenAPIHono<AppEnv>,
  { locations, idIndex }: SholatData,
) => {
  const allPath = "/sholat/kabkota/semua";
  const byIdPath = "/sholat/kabkota/{id}";
  const searchPath = "/sholat/kabkota/cari/{keyword}";
  const searchAliases = [
    "/sholat/kabkota/find/{keyword}",
    "/sholat/kota/cari/{keyword}",
    "/sholat/kota/find/{keyword}",
  ];
  const routeAliases: Record<string, string[]> = {
    [allPath]: [
      "/sholat/kabkota/all",
      "/sholat/kota/semua",
      "/sholat/kota/all",
    ],
    [byIdPath]: ["/sholat/kota/{id}"],
    [searchPath]: searchAliases,
  };

  type RouteHandler = (c: Context<AppEnv>) => Promise<Response> | Response;
  const toHonoPath = (path: string) =>
    path.replace(/\{([^}]+)\}/g, ":$1");
  const registerAliasRoutes = (path: string, handler: RouteHandler) => {
    const aliases = routeAliases[path] ?? [];
    for (const alias of aliases) {
      app.get(toHonoPath(alias), handler);
    }
  };
  const aliasDescription = (path: string) => {
    const aliases = routeAliases[path];
    if (!aliases?.length) return "";
    return ` Alias: ${aliases.join(", ")}.`;
  };

  const respondAllLocations: RouteHandler = (c) =>
    c.json(successResponse(locations));
  const respondById = (c: Context<AppEnv>, rawId: string) => {
    const id = rawId.trim();
    if (!id) {
      return c.json(errorResponse(), 404);
    }
    const location = idIndex.get(id);
    if (!location) {
      return c.json(errorResponse(), 404);
    }
    return c.json(successResponse([location]), 200);
  };
  const respondSearch = (c: Context<AppEnv>, keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return c.json(errorResponse("keyword is required"), 400);
    }
    const result = locations.filter((loc) =>
      loc.lokasi.toLowerCase().includes(normalized),
    );

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
      description:
        `Daftar lengkap seluruh kabupaten/kota yang tersedia.${aliasDescription(
          path,
        )}`,
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
    });

  const createByIdRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Berdasar ID",
      description:
        `Mendapatkan kabupaten atau kota berdasarkan ID.${aliasDescription(
          path,
        )}`,
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z
            .string()
            .openapi({ example: "eda80a3d5b344bc40f3bc04f65b7a357" }),
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
    });

  const createSearchRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Pencarian",
      description:
        `Pencarian Kabupaten atau Kota berdasarkan kata kunci.${aliasDescription(
          path,
        )}`,
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
    });

  const createJadwalRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Jadwal Sholat",
      description:
        "Jadwal sholat harian (YYYY-MM-DD) atau bulanan (YYYY-MM) berdasarkan ID kab/kota.",
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z
            .string()
            .openapi({ example: "eda80a3d5b344bc40f3bc04f65b7a357" }),
          period: z.string().openapi({
            example: "2026-06-23",
            description:
              "Gunakan format YYYY-MM untuk bulanan atau YYYY-MM-DD untuk harian.",
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
      summary: "Jadwal Sholat Hari Ini",
      description:
        "Menampilkan jadwal sholat kab/kota untuk tanggal hari ini berdasarkan zona waktu pilihan.",
      tags: ["Sholat"],
      request: {
        params: z.object({
          id: z
            .string()
            .openapi({ example: "58a2fc6ed39fd083f55d4182bf88826d" }),
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
    });

  app.openapi(createAllRoute(allPath), respondAllLocations);
  registerAliasRoutes(allPath, respondAllLocations);

  app.openapi(createByIdRoute(byIdPath), (c) => {
    const { id } = c.req.valid("param");
    return respondById(c, id);
  });
  registerAliasRoutes(byIdPath, (c) => respondById(c, c.req.param("id")));

  app.openapi(createSearchRoute(searchPath), (c) => {
    const { keyword } = c.req.valid("param");
    return respondSearch(c, keyword);
  });
  registerAliasRoutes(searchPath, (c) =>
    respondSearch(c, c.req.param("keyword")),
  );

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
        const key = `${parsedPeriod.year}-${parsedPeriod.month}-${parsedPeriod.day}`;
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
};
