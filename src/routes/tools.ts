import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCurlSample } from "~/lib/docs.ts";
import type { GeocodeService } from "~/services/geocode.ts";
import { resolveClientIp } from "~/services/tools.ts";
import type { AppEnv } from "~/types.ts";

const ipDataSchema = z
  .object({
    ip: z.string().openapi({ example: "203.0.113.10" }),
    source: z.string().openapi({ example: "x-forwarded-for" }),
    agent: z.string().openapi({ example: "Mozilla/5.0" }),
  })
  .openapi("IpInfo");

const ipSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: ipDataSchema,
  })
  .openapi("IpResponse");

const ipErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Tidak dapat menentukan IP." }),
  })
  .openapi("IpError");

const geocodeBodySchema = z.object({
  query: z.string().min(1).openapi({ example: "Masjid Istiqlal Jakarta" }),
});

const geocodeEntrySchema = z
  .object({
    place_id: z.number().openapi({ example: 54625430 }),
    class: z.string().openapi({ example: "amenity" }),
    type: z.string().openapi({ example: "place_of_worship" }),
    lat: z.string().openapi({ example: "-6.1702779" }),
    lon: z.string().openapi({ example: "106.8310435" }),
    name: z.string().openapi({ example: "Masjid Istiqlal" }).optional(),
    display_name: z
      .string()
      .openapi({ example: "Masjid Istiqlal, Jalan KH Hasyim Asyari ..." }),
    address: z.record(z.string()).optional(),
    extratags: z.record(z.string()).optional(),
    boundingbox: z
      .object({
        south: z.string(),
        north: z.string(),
        west: z.string(),
        east: z.string(),
      })
      .optional(),
  })
  .openapi("GeocodeEntry");

const geocodeSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: geocodeEntrySchema,
  })
  .openapi("GeocodeResponse");

const geocodeErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Gagal memproses geocode." }),
  })
  .openapi("GeocodeError");

type RegisterToolsDeps = {
  app: OpenAPIHono<AppEnv>;
  docBaseUrl: string;
  geocodeService: GeocodeService | null;
};

export const registerToolsRoutes = ({
  app,
  docBaseUrl,
  geocodeService,
}: RegisterToolsDeps) => {
  const ipRoute = createRoute({
    method: "get",
    path: "/tools/ip",
    summary: "Deteksi IP",
    description:
      "Mengembalikan alamat IP pengunjung beserta sumber deteksi (header proxy/remote) dan user agent.",
    tags: ["Tools"],
    responses: {
      200: {
        description: "Informasi IP tersedia.",
        content: { "application/json": { schema: ipSuccessSchema } },
      },
      400: {
        description: "IP tidak dapat ditentukan.",
        content: { "application/json": { schema: ipErrorSchema } },
      },
    },
    "x-codeSamples": [
      {
        lang: "curl",
        label: "cURL",
        source: buildCurlSample(docBaseUrl, "GET", "/tools/ip"),
      },
    ],
  });

  app.openapi(ipRoute, (c) => {
    const info = resolveClientIp({
      header: (name) => c.req.header(name) ?? undefined,
      remoteAddr: c.env?.connInfo?.remoteAddr as
        | Deno.NetAddr
        | Deno.UnixAddr
        | undefined,
    });
    if (!info) {
      return c.json(
        { status: false, message: "Tidak dapat menentukan IP." },
        400,
      );
    }
    const agent = c.req.header("user-agent") ?? "unknown";
    return c.json({
      status: true,
      message: "success",
      data: { ip: info.ip, source: info.source, agent },
    });
  });

  const geocodeRoute = createRoute({
    method: "post",
    path: "/tools/geocode",
    summary: "Geocode (maps.co)",
    description:
      "Mencari koordinat menggunakan layanan maps.co (API ini dibatasi 1 request per detik).",
    tags: ["Tools"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: geocodeBodySchema,
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        description: "Data geocode berhasil didapatkan.",
        content: { "application/json": { schema: geocodeSuccessSchema } },
      },
      400: {
        description: "Request tidak valid atau kuota penuh.",
        content: { "application/json": { schema: geocodeErrorSchema } },
      },
      500: {
        description: "Kesalahan server atau API key tidak tersedia.",
        content: { "application/json": { schema: geocodeErrorSchema } },
      },
    },
    "x-codeSamples": [
      {
        lang: "curl",
        label: "cURL",
        source: buildCurlSample(
          docBaseUrl,
          "POST",
          "/tools/geocode",
          JSON.stringify({
            query: "Masjid Istiqlal Jakarta",
          }),
        ),
      },
    ],
  });

  app.openapi(geocodeRoute, async (c) => {
    const body = c.req.valid("json");
    if (!geocodeService) {
      return c.json(
        { status: false, message: "Layanan geocode tidak tersedia." },
        500,
      );
    }
    try {
      const payload = await geocodeService.enqueue(body.query);
      const results = Array.isArray(payload) ? payload : [];
      const normalized = normalizeGeocodeEntry(results[0]);
      if (!normalized) {
        return c.json(
          { status: false, message: "Lokasi tidak ditemukan." },
          400,
        );
      }
      return c.json({ status: true, message: "success", data: normalized });
    } catch (error) {
      if (error instanceof Error && error.message === "QUEUE_OVERFLOW") {
        return c.json(
          {
            status: false,
            message: "Permintaan sedang padat, coba lagi beberapa saat lagi.",
          },
          400,
        );
      }
      if (
        error instanceof Error &&
        error.message === "MAPSCO_API_KEY missing"
      ) {
        return c.json(
          { status: false, message: "MAPSCO_API_KEY tidak tersedia." },
          500,
        );
      }
      console.error("Geocode error", error);
      return c.json(
        { status: false, message: "Gagal memproses permintaan geocode." },
        400,
      );
    }
  });
};
type GeocodeEntry = z.infer<typeof geocodeEntrySchema>;

const normalizeRecord = (
  value: unknown,
): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const output: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") {
      output[key] = val;
    }
  }
  return Object.keys(output).length ? output : undefined;
};

const normalizeBoundingBox = (
  value: unknown,
): { south: string; north: string; west: string; east: string } | undefined => {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  const [south, north, west, east] = value.map((item) => String(item));
  return { south, north, west, east };
};

const normalizeGeocodeEntry = (value: unknown): GeocodeEntry | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const placeId = Number(raw.place_id);
  const clazz = typeof raw.class === "string" ? raw.class : "";
  const type = typeof raw.type === "string" ? raw.type : "";
  const lat = typeof raw.lat === "string" ? raw.lat : String(raw.lat ?? "");
  const lon = typeof raw.lon === "string" ? raw.lon : String(raw.lon ?? "");
  const displayName = typeof raw.display_name === "string"
    ? raw.display_name
    : "";
  if (
    !Number.isFinite(placeId) ||
    !clazz ||
    !type ||
    !lat ||
    !lon ||
    !displayName
  ) {
    return null;
  }
  return {
    place_id: placeId,
    class: clazz,
    type,
    lat,
    lon,
    name: typeof raw.name === "string" ? raw.name : undefined,
    display_name: displayName,
    address: normalizeRecord(raw.address),
    extratags: normalizeRecord(raw.extratags),
    boundingbox: normalizeBoundingBox(raw.boundingbox),
  };
};
