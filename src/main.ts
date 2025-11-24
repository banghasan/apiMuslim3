import "@std/dotenv/load";
import type { MiddlewareHandler } from "hono";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerCalRoutes } from "~/routes/cal.ts";
import { loadSholatData, registerSholatRoutes } from "~/routes/sholat.ts";
import type { AppEnv } from "~/types.ts";

const logDir = new URL("../data/log/", import.meta.url);
await Deno.mkdir(logDir, { recursive: true });
const faviconFile = new URL("../favicon.ico", import.meta.url);
const faviconBytes = await Deno.readFile(faviconFile);
const redocScriptFile = new URL(
  "./static/redoc.standalone.js",
  import.meta.url,
);
const redocScriptBytes = await Deno.readFile(redocScriptFile);

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
  const line = `[${formatTimestamp(
    logTime,
  )}] ${ip} ${c.req.method} ${c.req.path} ${c.res.status} ${rt}ms`;
  if (logVerbose) {
    console.log(line);
  }
  await appendAccessLog(line, logTime);
};

const redocPage = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>API Muslim v3</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      redoc {
        width: 100%;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="redoc-container"></div>
    <script src="/doc/redoc.standalone.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        if (window.Redoc) {
          Redoc.init('/doc/sholat', {}, document.getElementById('redoc-container'));
        } else {
          document.getElementById('redoc-container').innerText =
            'Gagal memuat dokumentasi.';
        }
      });
    </script>
  </body>
</html>`;

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
app.get(
  "/doc/redoc.standalone.js",
  () =>
    new Response(redocScriptBytes, {
      headers: {
        "content-type": "application/javascript",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get("/doc", (c) => c.html(redocPage));
app.get("/doc/", (c) => c.html(redocPage));
app.get("/doc/index.html", (c) => c.html(redocPage));

const sholatData = await loadSholatData();
registerSholatRoutes(app, sholatData);
registerCalRoutes(app);

app.notFound((c) =>
  c.json({ status: false, message: "Data tidak ditemukan .." }, 404),
);
app.onError((err, c) => {
  console.error(err);
  return c.json({ status: false, message: "internal server error" }, 500);
});

const host = Deno.env.get("HOST") ?? "127.0.0.1";
const port = Number(Deno.env.get("PORT") ?? "8000");
const docHost = host === "0.0.0.0" ? "localhost" : host;

app.doc("/doc/sholat", {
  openapi: "3.1.0",
  info: {
    title: "API Muslim",
    version: "v3.0.0",
    tags: [
      {
        name: "Sholat",
        description: "Endpoint terkait sholat",
      },
      {
        name: "Kalender",
        description: "Endpoint konversi kalender CE dan Hijriyah",
      },
    ],
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
