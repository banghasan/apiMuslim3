import { OpenAPIHono } from "@hono/zod-openapi";
import { config } from "~/config.ts";
import { createAccessLogger } from "~/middleware/logger.ts";
import { registerCalRoutes } from "~/routes/cal.ts";
import { registerQiblaRoutes } from "~/routes/qibla.ts";
import { registerToolsRoutes } from "~/routes/tools.ts";
import { registerSholatRoutes } from "~/routes/sholat.ts";
import { createGeocodeService } from "~/services/geocode.ts";
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
const geocodeService = config.mapsCoApiKey
  ? createGeocodeService(config.mapsCoApiKey)
  : null;

const redocPage = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>API Muslim v3</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        --primary: #0f766e;
        --primary-light: #99f6e4;
        --primary-dark: #115e59;
        --header-bg-start: #064e3b;
        --header-bg-end: #0f766e;
        --sidebar-bg: rgb(22, 100, 123);
        --sidebar-text: #e5fffb;
        --bg: #f8fbfb;
        --text: #0f172a;
        --muted: #475569;
        --right-panel-bg: #1f2937;
        --right-panel-text: #e2e8f0;
      }
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      redoc {
        width: 100%;
        height: 100vh;
      }
      .doc-header {
        background: linear-gradient(135deg, var(--header-bg-start), var(--header-bg-end));
        color: #ecfdf5;
        padding: 40px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.2);
      }
      .doc-brand h1 {
        margin: 0 0 4px 0;
        font-size: 2.1rem;
        font-weight: 700;
      }
      .doc-brand p {
        margin: 0;
        opacity: 0.9;
        color: rgba(236, 253, 245, 0.9);
      }
      .doc-actions {
        margin-top: 12px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .doc-actions button {
        background: var(--primary);
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 999px;
        cursor: pointer;
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.4px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 10px 15px rgba(37, 99, 235, 0.2);
      }
      .doc-actions button:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(37, 99, 235, 0.25);
      }
      .doc-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .doc-nav a {
        color: var(--text);
        background: white;
        padding: 8px 14px;
        border-radius: 999px;
        font-weight: 600;
        text-decoration: none;
        border: 1px solid rgba(15, 23, 42, 0.1);
        transition: transform 0.15s ease, background 0.2s ease,
          border-color 0.2s ease;
      }
      .doc-nav a:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(15, 118, 110, 0.4);
      }
    </style>
  </head>
  <body>
    <header class="doc-header">
      <div class="doc-brand">
        <h1>API Muslim v3 &middot; Dokumentasi</h1>
        <p>
          Tekan <kbd>Ctrl</kbd> + <kbd>/</kbd> (atau klik tombol cari) untuk
          fokus ke kolom pencarian ReDoc. Gunakan tautan kategori di bawah ini
          untuk melompat ke bagian terkait.
        </p>
        <div class="doc-actions">
          <button id="doc-search">Cari di Dokumentasi (Ctrl+/)</button>
        </div>
      </div>
      <nav class="doc-nav">
        <a href="#tag/Sholat" data-tag-link="Sholat">Sholat</a>
        <a href="#tag/Kalender" data-tag-link="Kalender">Kalender</a>
        <a href="#tag/Qibla" data-tag-link="Qibla">Qibla</a>
        <a href="#tag/Tools" data-tag-link="Tools">Tools</a>
      </nav>
    </header>
    <div id="redoc-container"></div>
    <script src="/doc/redoc.standalone.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        const container = document.getElementById('redoc-container');
        const focusRedocSearch = () => {
          const searchInput = document.querySelector('redoc .search-input input');
          if (searchInput) {
            searchInput.focus();
          }
        };
        const hookTagLinks = () => {
          document.querySelectorAll('[data-tag-link]').forEach((link) => {
            link.addEventListener('click', (event) => {
              event.preventDefault();
              const tagName = link.getAttribute('data-tag-link');
              if (tagName) {
                window.location.hash = 'tag/' + encodeURIComponent(tagName);
                container.scrollIntoView({ behavior: 'smooth' });
              }
            });
          });
        };

        const searchButton = document.getElementById('doc-search');
        if (searchButton) {
          searchButton.addEventListener('click', (event) => {
            event.preventDefault();
            focusRedocSearch();
          });
        }

        document.addEventListener('keydown', (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            focusRedocSearch();
          }
        });

        hookTagLinks();

        if (window.Redoc) {
          Redoc.init(
            '/doc/apimuslim',
            {
              scrollYOffset: 90,
              hideDownloadButton: false,
              expandResponses: '200',
              theme: {
                sidebar: {
                  backgroundColor: 'rgb(22, 100, 123)',
                  textColor: '#e0f7fb',
                  activeTextColor: '#ffffff',
                },
                typography: {
                  fontSize: '15px',
                  headings: {
                    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  },
                },
                colors: {
                  primary: { main: '#16a34a' },
                  text: { primary: '#0f172a', secondary: '#475569' },
                },
                rightPanel: {
                  backgroundColor: '#0f172a',
                  textColor: '#e2e8f0',
                },
                menu: {
                  backgroundColor: '#22c55e',
                  textColor: '#f0fdf4',
                },
              },
            },
            container,
          ).then(() => {
            focusRedocSearch();
          });
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
registerToolsRoutes({
  app,
  docBaseUrl: config.docBaseUrl,
  geocodeService,
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
      "Endpoint terkait sholat: kota-kota yang didukung, jadwal sholat harian, dan lainnya.",
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
      "Endpoint perhitungan arah kiblat berdasarkan koordinat latitude/longitude.",
  },
  { name: "Tools", description: "Beragam alat bantu (IP, dsb)." },
];

app.doc("/doc/apimuslim", {
  openapi: "3.1.0",
  info: {
    title: "API Muslim",
    version: "v3.0.0",
    description:
      "Endpoint untuk daftar kabupaten/kota beserta pencarian ID yang digunakan untuk jadwal sholat.",
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
