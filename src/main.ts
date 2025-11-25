import { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "~/config.ts";
import { createAccessLogger } from "~/middleware/logger.ts";
import { createStatsRecorder } from "~/middleware/stats_logger.ts";
import { registerCalRoutes } from "~/routes/cal.ts";
import { rateLimitConfig } from "~/config/rate_limit.ts";
import { registerQiblaRoutes } from "~/routes/qibla.ts";
import { registerToolsRoutes } from "~/routes/tools.ts";
import { registerSholatRoutes } from "~/routes/sholat.ts";
import { registerStatsRoutes } from "~/routes/stats.ts";
import { createGeocodeService } from "~/services/geocode.ts";
import { createJadwalService } from "~/services/jadwal.ts";
import { createSholatService, loadSholatData } from "~/services/sholat.ts";
import { createStatsService } from "~/services/stats.ts";
import type { AppEnv } from "~/types.ts";
import { registerHealthRoutes } from "~/routes/health.ts";
import { createRateLimitMiddleware } from "~/middleware/rate_limit.ts";

const faviconFile = new URL("../favicon.ico", import.meta.url);
const faviconBytes = await Deno.readFile(faviconFile);
const redocScriptFile = new URL(
  "./static/redoc.standalone.js",
  import.meta.url,
);
const redocScriptBytes = await Deno.readFile(redocScriptFile);
const myQuranLogoFile = new URL("./static/api-myquran.png", import.meta.url);
const myQuranLogoBytes = await Deno.readFile(myQuranLogoFile);
const appleTouchIconFile = new URL(
  "./static/apple-touch-icon.png",
  import.meta.url,
);
const appleTouchIconBytes = await Deno.readFile(appleTouchIconFile);
const favicon32File = new URL("./static/favicon-32x32.png", import.meta.url);
const favicon32Bytes = await Deno.readFile(favicon32File);
const favicon16File = new URL("./static/favicon-16x16.png", import.meta.url);
const favicon16Bytes = await Deno.readFile(favicon16File);
const manifestFile = new URL("./static/site.webmanifest", import.meta.url);
const manifestBytes = await Deno.readFile(manifestFile);

const sholatData = await loadSholatData();
const sholatService = createSholatService({
  enableCache: config.enableCache,
  data: sholatData,
});
const jadwalService = createJadwalService(config);
const geocodeService = config.mapsCoApiKey
  ? createGeocodeService(config.mapsCoApiKey)
  : null;
const statsDir = new URL("../data", import.meta.url);
await Deno.mkdir(statsDir, { recursive: true });
const statsDbFile = new URL("../data/stats.db", import.meta.url);
const statsDbPath = decodeURIComponent(statsDbFile.pathname);
const statsService = createStatsService(statsDbPath);

// Load documentation HTML template
const docTemplateFile = new URL("./static/doc.html", import.meta.url);
const docTemplateBytes = await Deno.readFile(docTemplateFile);
const redocPage = new TextDecoder().decode(docTemplateBytes);

const startedAt = new Date();
const app = new OpenAPIHono<AppEnv>();
app.use("*", createStatsRecorder(statsService));
app.use("*", createAccessLogger(config));
app.use("*", createRateLimitMiddleware(rateLimitConfig));
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
app.get(
  "/doc/api-myquran.png",
  () =>
    new Response(myQuranLogoBytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get(
  "/apple-touch-icon.png",
  () =>
    new Response(appleTouchIconBytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get(
  "/favicon-32x32.png",
  () =>
    new Response(favicon32Bytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get(
  "/favicon-16x16.png",
  () =>
    new Response(favicon16Bytes, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get(
  "/site.webmanifest",
  () =>
    new Response(manifestBytes, {
      headers: {
        "content-type": "application/manifest+json",
        "cache-control": "public, max-age=604800",
      },
    }),
);
app.get("/", (c) =>
  c.json({
    status: true,
    message: "Selamat datang di api.myquran.com versi 3",
    data: [
      "baca /doc untuk mendapatkan cara penggunaannya",
      "Diskusi pada Grup Telegram @apimuslim",
      "myQuran.com",
    ],
  }));

registerSholatRoutes(app, {
  sholatService,
  jadwalService,
  docBaseUrl: config.docBaseUrl,
});
registerCalRoutes(app, config.docBaseUrl);
registerQiblaRoutes({ app, docBaseUrl: config.docBaseUrl });
registerToolsRoutes({
  app,
  docBaseUrl: config.docBaseUrl,
  geocodeService,
});
registerStatsRoutes({
  app,
  docBaseUrl: config.docBaseUrl,
  statsService,
});
registerHealthRoutes({
  app,
  docBaseUrl: config.docBaseUrl,
  startedAt,
  config,
});

app.notFound((c) =>
  c.json({ status: false, message: "Data tidak ditemukan .." }, 404)
);
app.onError((err, c) => {
  console.error(err);
  return c.json({ status: false, message: "internal server error" }, 500);
});

const tagDefinitions = [
  {
    name: "Sholat",
    description:
      `Kamu dapat mengakses endpoint salat yang mencakup detail penting seperti cakupan kota-kota yang tersedia, jadwal salat harian yang akurat, dan informasi teknis relevan lainnya. Silakan gunakan data ini sesuai kebutuhan integrasi Anda
> Sumber data dari situs [kemenag bimaislam](https://bimasislam.kemenag.go.id/web/jadwalshalat)

    Terakhir diupdate pada 25 November 2025

Kolom kota dan kabupaten telah disesuaikan sebagaimana sumber.`,
  },
  {
    name: "Kalender",
    description: `Endpoint konversi kalender CE dan Hijriyah.

**CE** adalah *Common Era*. Nama lain dari penanggalan Masehi. Istilah ini adalah alternatif modern dan netral secara agama untuk **Anno Domini** (AD), digunakan terutama dalam konteks akademik dan ilmu pengetahuan.
 ‎
Nama lainnya adalah **Syamsiah**, *Syamsiah* atau *Tahun Matahari*. Penamaan ini mengacu pada dasar perhitungannya, yaitu pada matahari, berlawanan dengan Kalender Hijriah yang berdasarkan pergerakan bulan (Komariah)
 ‎
Pilihan metode yang dapat dipilih:
- \`standar\` (default)
- \`islamic-umalqura\`
- \`islamic-civil\``,
  },
  {
    name: "Qibla",
    description:
      "Untuk perhitungan arah kiblat, silakan gunakan endpoint ini dengan mengirimkan koordinat latitude/longitude yang relevan. Sebagai alternatif, jika data koordinat belum tersedia, kamu bisa mendapatkan data tersebut terlebih dahulu melalui endpoint helper kami, yaitu `/tools/geocode`",
  },
  {
    name: "Tools",
    description:
      "Beragam alat bantu seperti deteksi IP, geocode, dan health check API.",
  },
  {
    name: "Stats",
    description: "Statistik pemakaian API berdasarkan tahun dan bulan.",
  },
];

app.doc("/doc/apimuslim", {
  openapi: "3.1.0",
  info: {
    title: "API Muslim",
    version: "v3.0.0",
    description:
      `![](https://raw.githubusercontent.com/banghasan/apiMuslim3/main/src/static/api-myquran_text.png)
\
> API Komprehensif untuk kebutuhan Muslim di Indonesia, menyediakan data jadwal sholat, arah kiblat, konversi kalender Hijriah, dan berbagai alat bantu lainnya. Semua endpoint dirancang untuk kemudahan penggunaan dan integrasi

alQuran dan lainnya, *insyaAllah*, segera.

## Kontak
Saran, ide, diskusi dan komunikasi dapat melalui:
- Grup Telegram [@ApiMuslim](https://t.me/apimuslim)
- Email: banghasan@myquran.com
`,
  },
  tags: tagDefinitions,
  "x-tagGroups": [
    {
      name: "API Muslim Indonesia",
      tags: ["Sholat", "Kalender", "Qibla", "Tools", "Stats"],
    },
  ],
  servers: [
    {
      url: config.docBaseUrl,
      description: "Gunakan basis URL ini saat mencoba contoh API",
    },
  ],
});

const docHost = config.host === "0.0.0.0" ? "localhost" : config.host;
console.log(`Listening on http://${docHost}:${config.port}`);
Deno.serve(
  { hostname: config.host, port: config.port },
  (request, connInfo) => app.fetch(request, { connInfo }),
);
