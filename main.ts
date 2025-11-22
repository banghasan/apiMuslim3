import "jsr:@std/dotenv/load";
import type { MiddlewareHandler } from "hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

type RawEntry = {
  value: string;
  text: string;
};

type KabKotaSource = {
  fetchedAt?: string;
  map?: Record<string, RawEntry[]>;
};

type Location = {
  id: string;
  lokasi: string;
};

type AppEnv = {
  Bindings: {
    connInfo?: Deno.ServeHandlerInfo;
  };
};

const kabKotaFile = new URL("./data/sholat/kabkota.json", import.meta.url);
const logDir = new URL("./data/log/", import.meta.url);
await Deno.mkdir(logDir, { recursive: true });
const parsedSource = JSON.parse(
  await Deno.readTextFile(kabKotaFile),
) as KabKotaSource;
const faviconFile = new URL("./favicon.ico", import.meta.url);
const faviconBytes = await Deno.readFile(faviconFile);

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

const successResponse = (data: Location[]) => ({
  status: true as const,
  message: "success",
  data,
});

const errorResponse = (message = "not found or anything ..") => ({
  status: false as const,
  message,
});

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
    message: z.string().openapi({ example: "not found or anything .." }),
  })
  .openapi("ErrorResponse");

const timezone = Deno.env.get("TIMEZONE") ?? "Asia/Jakarta";
const logVerbose =
  (Deno.env.get("LOG_VERBOSE") ?? "false").toLowerCase() === "true";
const logWrite =
  (Deno.env.get("LOG_WRITE") ?? "false").toLowerCase() === "true";
let timeFormatter: Intl.DateTimeFormat | null = null;
let dateFormatter: Intl.DateTimeFormat | null = null;
try {
  timeFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "medium",
  });
  dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
} catch (error) {
  console.warn(
    `Invalid TIMEZONE "${timezone}", fallback to ISO string.`,
    error,
  );
}

const formatTimestamp = (value = new Date()) =>
  timeFormatter?.format(value) ?? value.toISOString();
const formatLogDate = (value: Date) =>
  (dateFormatter?.format(value) ?? value.toISOString().slice(0, 10)).replaceAll(
    "-",
    "",
  );

const appendAccessLog = async (line: string, stamp: Date) => {
  if (!logWrite) return;
  const fileUrl = new URL(`${formatLogDate(stamp)}.log`, logDir);
  try {
    await Deno.writeTextFile(fileUrl, `${line}\n`, { append: true });
  } catch (error) {
    console.error("Failed to write access log", error);
  }
};

const accessLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = performance.now();
  await next();
  const forwarded =
    c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip");
  let ip = forwarded?.split(",")[0].trim();
  if (!ip) {
    const addr = c.env?.connInfo?.remoteAddr as
      | Deno.NetAddr
      | Deno.UnixAddr
      | undefined;
    if (addr && typeof addr === "object" && "hostname" in addr) {
      ip = addr.hostname;
    }
  }
  if (!ip) ip = "unknown";
  const rt = (performance.now() - start).toFixed(2);
  const logTime = new Date();
  const line = `[${formatTimestamp(logTime)}] ${ip} ${c.req.method} ${c.req.path} ${c.res.status} ${rt}ms`;
  if (logVerbose) {
    console.log(line);
  }
  await appendAccessLog(line, logTime);
};

const app = new OpenAPIHono<AppEnv>();
app.use("*", accessLogger);
app.get(
  "/favicon.ico",
  () =>
    new Response(faviconBytes, {
      headers: {
        "content-type": "image/x-icon",
        "cache-control": "public, max-age=86400",
      },
    }),
);

const allPaths = [
  "/sholat/kota/all",
  "/sholat/kabkota/all",
  "/sholat/kota/semua",
  "/sholat/kabkota/semua",
];

const byIdPaths = ["/sholat/kota/{id}", "/sholat/kabkota/{id}"];

const searchPaths = [
  "/sholat/kota/cari/{keyword}",
  "/sholat/kabkota/cari/{keyword}",
  "/sholat/kota/find/{keyword}",
  "/sholat/kabkota/find/{keyword}",
];

const createAllRoute = (path: string) =>
  createRoute({
    method: "get",
    path,
    summary: "Daftar lengkap seluruh kabupaten/kota yang tersedia.",
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
    summary: "Menampilkan detail kab/kota berdasarkan ID.",
    tags: ["Sholat"],
    request: {
      params: z.object({
        id: z.string().openapi({ example: "eda80a3d5b344bc40f3bc04f65b7a357" }),
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
    summary: "Pencarian kab/kota berdasarkan kata kunci.",
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
  app.openapi(createAllRoute(path), (c) => c.json(successResponse(locations)));
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

app.notFound((c) => c.json(errorResponse(), 404));

app.onError((err, c) => {
  console.error(err);
  return c.json(errorResponse("internal server error"), 500);
});

const host = Deno.env.get("HOST") ?? "127.0.0.1";
const port = Number(Deno.env.get("PORT") ?? "8000");
const docHost = host === "0.0.0.0" ? "localhost" : host;

app.doc("/doc/sholat", {
  openapi: "3.1.0",
  info: {
    title: "API Sholat Kab/Kota",
    version: "1.0.0",
    description:
      "Endpoint untuk daftar kabupaten/kota beserta pencarian ID yang digunakan untuk jadwal sholat.",
  },
  servers: [
    {
      url: `http://${docHost}:${port}`,
      description: "Server aktif berdasarkan konfigurasi ENV",
    },
  ],
});

console.log(`Listening on http://${docHost}:${port}`);
Deno.serve({ hostname: host, port }, (request, connInfo) =>
  app.fetch(request, { connInfo }),
);
