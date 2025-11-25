import { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "~/config.ts";
import { createAccessLogger } from "~/middleware/logger.ts";
import { registerCalRoutes } from "~/routes/cal.ts";
import { rateLimitConfig } from "~/config/rate_limit.ts";
import { registerQiblaRoutes } from "~/routes/qibla.ts";
import { registerToolsRoutes } from "~/routes/tools.ts";
import { registerSholatRoutes } from "~/routes/sholat.ts";
import { createGeocodeService } from "~/services/geocode.ts";
import { createJadwalService } from "~/services/jadwal.ts";
import { createSholatService, loadSholatData } from "~/services/sholat.ts";
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

const sholatData = await loadSholatData();
const sholatService = createSholatService({
  enableCache: config.enableCache,
  data: sholatData,
});
const jadwalService = createJadwalService(config);
const geocodeService = config.mapsCoApiKey
  ? createGeocodeService(config.mapsCoApiKey)
  : null;

// Load documentation HTML template
const docTemplateFile = new URL("./static/doc.html", import.meta.url);
const docTemplateBytes = await Deno.readFile(docTemplateFile);
const redocPage = new TextDecoder().decode(docTemplateBytes);

const startedAt = new Date();
const app = new OpenAPIHono<AppEnv>();
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
      "Kamu dapat mengakses endpoint salat yang mencakup detail penting seperti cakupan kota-kota yang tersedia, jadwal salat harian yang akurat, dan informasi teknis relevan lainnya. Silakan gunakan data ini sesuai kebutuhan integrasi Anda",
  },
  {
    name: "Kalender",
    description: `Endpoint konversi kalender CE dan Hijriyah.

CE adalah Common Era. Nama lain dari penanggalan Masehi. Istilah ini adalah alternatif modern dan netral secara agama untuk Anno Domini (AD), digunakan terutama dalam konteks akademik dan ilmu pengetahuan.

Nama lainnya adalah Syamsiah, Syamsiah atau Tahun Matahari. Penamaan ini mengacu pada dasar perhitungannya, yaitu pergerakan bumi mengelilingi matahari (revolusi bumi), berlawanan dengan Kalender Hijriah yang berdasarkan pergerakan bulan (Komariah)`,
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
];

app.doc("/doc/apimuslim", {
  openapi: "3.1.0",
  info: {
    title: "API Muslim",
    version: "v3.0.0",
    description:
      "API Komprehensif untuk kebutuhan Muslim di Indonesia, menyediakan data jadwal sholat, arah kiblat, konversi kalender Hijriah, dan berbagai alat bantu lainnya. Semua endpoint dirancang untuk kemudahan penggunaan dan integrasi",
  },
  contact: {
    name: "bang Hasan",
    url: "https://myquran.com",
    email: "banghasan@myquran.com",
  },
  tags: tagDefinitions,
  "x-tagGroups": [
    {
      name: "API Muslim Indonesia",
      tags: ["Sholat", "Kalender", "Qibla", "Tools"],
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
