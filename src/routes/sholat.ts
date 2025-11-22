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
  const allPaths = ["/sholat/kabkota/semua"];

  const byIdPaths = ["/sholat/kabkota/{id}"];

  const searchPaths = ["/sholat/kabkota/cari/{keyword}"];

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
};
