import { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "~/config.ts";
import { createAccessLogger } from "~/middleware/logger.ts";
import { registerCalRoutes } from "~/routes/cal.ts";
import { registerQiblaRoutes } from "~/routes/qibla.ts";
import { registerToolsRoutes } from "~/routes/tools.ts";
import { registerSholatRoutes } from "~/routes/sholat.ts";
import { createJadwalService } from "~/services/jadwal.ts";
import { createSholatService, loadSholatData } from "~/services/sholat.ts";
import type { AppEnv } from "~/types.ts";

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
          Redoc.init('/doc/apimuslim', {}, document.getElementById('redoc-container'));
        } else {
          document.getElementById('redoc-container').innerText =
            'Gagal memuat dokumentasi.';
        }
      });
    </script>
  </body>
</html>`;

const app = new OpenAPIHono<AppEnv>();
app.use("*", createAccessLogger(config));
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
registerToolsRoutes({ app, docBaseUrl: config.docBaseUrl });

app.notFound((c) =>
  c.json({ status: false, message: "Data tidak ditemukan .." }, 404)
);
app.onError((err, c) => {
  console.error(err);
  return c.json({ status: false, message: "internal server error" }, 500);
});

app.doc("/doc/apimuslim", {
  openapi: "3.1.0",
  info: {
    title: "API Muslim",
    version: "v3.0.0",
    tags: [
      { name: "Sholat", description: "Endpoint terkait sholat" },
      {
        name: "Kalender",
        description: "Endpoint konversi kalender CE dan Hijriyah",
      },
      { name: "Tools", description: "Beragam alat bantu (IP, dsb)." },
    ],
    description:
      "Endpoint untuk daftar kabupaten/kota beserta pencarian ID yang digunakan untuk jadwal sholat.",
  },
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
