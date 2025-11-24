import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
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

export type JadwalEntry = {
  tanggal: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

export type JadwalFileSource = {
  prov?: { text?: string };
  kab?: { text?: string };
  jadwal?: {
    prov?: string;
    kabko?: string;
    data?: Record<string, JadwalEntry>;
  };
};

export type JadwalResponseData = {
  id: string;
  kabko: string;
  prov: string;
  jadwal: Record<string, JadwalEntry>;
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

const DEFAULT_JADWAL_TIMEZONE = Deno.env.get("TIMEZONE") ?? "Asia/Jakarta";

const safeJadwalTimeZone = (value?: string | null) => {
  const input = (value ?? "").trim();
  if (!input) return DEFAULT_JADWAL_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input });
    return input;
  } catch {
    return DEFAULT_JADWAL_TIMEZONE;
  }
};

const getTodayPeriod = (timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(new Date());
  const [year, month, day] = formatted.split("-");
  return {
    year,
    month,
    day,
    key: `${year}-${month}-${day}`,
  };
};

const pad2 = (value: string | number) => String(value).trim().padStart(2, "0");

type SchedulePeriod =
  | { type: "monthly"; year: string; month: string }
  | { type: "daily"; year: string; month: string; day: string };

const parseSchedulePeriod = (period: string): SchedulePeriod | null => {
  const parts = period
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2 && parts.length !== 3) return null;

  const [yearPart, monthPart, dayPart] = parts;
  if (!/^\d{4}$/.test(yearPart ?? "")) return null;

  const monthNum = Number(monthPart);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return null;
  const month = pad2(monthNum);

  if (parts.length === 2) {
    return { type: "monthly", year: yearPart!, month };
  }

  const dayNum = Number(dayPart);
  if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) return null;
  const day = pad2(dayNum);
  return { type: "daily", year: yearPart!, month, day };
};

const loadScheduleFile = async (
  id: string,
  year: string,
  month: string,
): Promise<JadwalResponseData | null> => {
  const fileUrl = new URL(
    `../../data/sholat/jadwal/${year}/${id}-${year}-${month}.json`,
    import.meta.url,
  );
  try {
    const rawText = await Deno.readTextFile(fileUrl);
    const parsed = JSON.parse(rawText) as JadwalFileSource;
    const jadwalMap = parsed.jadwal?.data;
    if (!jadwalMap || typeof jadwalMap !== "object") {
      return null;
    }

    return {
      id,
      kabko: parsed.jadwal?.kabko ?? parsed.kab?.text ?? "",
      prov: parsed.jadwal?.prov ?? parsed.prov?.text ?? "",
      jadwal: jadwalMap,
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    console.error(`Failed to read schedule for ${id} ${year}-${month}:`, error);
    return null;
  }
};

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
  const allPaths = ["/sholat/kabkota/semua"];

  const byIdPaths = ["/sholat/kabkota/{id}"];

  const searchPaths = ["/sholat/kabkota/cari/{keyword}"];

  const jadwalPaths = ["/sholat/jadwal/{id}/{period}"];
  const jadwalTodayPaths = ["/sholat/jadwal/{id}/today"];

  const createAllRoute = (path: string) =>
    createRoute({
      method: "get",
      path,
      summary: "Kab/kota Semua",
      description: "Daftar lengkap seluruh kabupaten/kota yang tersedia.",
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
      description: "Mendapatkan kabupaten atau kota berdasarkan ID.",
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
      description: "Pencarian Kabupaten atau Kota berdasarkan kata kunci",
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

  for (const path of allPaths) {
    app.openapi(createAllRoute(path), (c) =>
      c.json(successResponse(locations)),
    );
  }

  for (const path of byIdPaths) {
    app.openapi(createByIdRoute(path), (c) => {
      const { id } = c.req.valid("param");
      const location = idIndex.get(id);
      if (!location) {
        return c.json(errorResponse(), 404);
      }

      return c.json(successResponse([location]), 200);
    });
  }

  for (const path of searchPaths) {
    app.openapi(createSearchRoute(path), (c) => {
      const { keyword } = c.req.valid("param");
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
    });
  }

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
