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
    <title>API Muslim v3 - Dokumentasi API</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: light;
        /* Modern Blue/Indigo Theme */
        --primary: #4f46e5;
        --primary-hover: #4338ca;
        --primary-light: #818cf8;
        --primary-dark: #3730a3;
        
        /* Header - Compact and Sticky */
        --header-bg: #1e1b4b;
        --header-text: #ffffff;
        
        /* Sidebar - Dark Blue */
        --sidebar-bg: #1e293b;
        --sidebar-text: #cbd5e1;
        --sidebar-active: #ffffff;
        
        /* Main Content - Light for readability */
        --content-bg: #ffffff;
        --content-text: #0f172a;
        
        /* Right Panel - Dark */
        --code-bg: #0f172a;
        --code-text: #e2e8f0;
        
        /* Shadows */
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--content-bg);
        color: var(--content-text);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Sticky Header - Compact Design */
      .doc-header {
        position: sticky;
        top: 0;
        z-index: 100;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        color: var(--header-text);
        padding: 16px 24px;
        box-shadow: var(--shadow-lg);
        border-bottom: 2px solid rgba(79, 70, 229, 0.3);
      }
      
      .doc-header-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      
      .doc-brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .doc-brand h1 {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0;
        background: linear-gradient(135deg, #ffffff 0%, #c7d2fe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .doc-brand .version {
        font-size: 0.75rem;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      /* Navigation - Horizontal Compact */
      .doc-nav {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .doc-nav a {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.875rem;
        text-decoration: none;
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
      }
      
      .doc-nav a:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }
      
      .search-btn {
        background: var(--primary) !important;
        color: white !important;
        border: none !important;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'Inter', sans-serif;
      }
      
      .search-btn:hover {
        background: var(--primary-hover) !important;
      }
      
      /* Redoc Container - No gaps */
      #redoc-container {
        width: 100%;
        min-height: calc(100vh - 70px);
      }
      
      redoc {
        width: 100%;
        display: block;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .doc-header {
          padding: 12px 16px;
        }
        
        .doc-header-content {
          gap: 12px;
        }
        
        .doc-brand h1 {
          font-size: 1.25rem;
        }
        
        .doc-brand .version {
          font-size: 0.7rem;
          padding: 3px 8px;
        }
        
        .doc-nav {
          width: 100%;
          justify-content: flex-start;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        .doc-nav a {
          white-space: nowrap;
          font-size: 0.8rem;
          padding: 6px 12px;
        }
      }
    </style>
  </head>
  <body>
    <header class="doc-header">
      <div class="doc-header-content">
        <div class="doc-brand">
          <h1>API Muslim v3</h1>
          <span class="version">Dokumentasi</span>
        </div>
        <nav class="doc-nav">
          <a href="#tag/Sholat" data-tag-link="Sholat">🕌 Sholat</a>
          <a href="#tag/Kalender" data-tag-link="Kalender">📅 Kalender</a>
          <a href="#tag/Qibla" data-tag-link="Qibla">🧭 Qibla</a>
          <a href="#tag/Tools" data-tag-link="Tools">🛠️ Tools</a>
          <button id="doc-search" class="search-btn">
            <span>🔍</span>
            <span>Cari</span>
          </button>
        </nav>
      </div>
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
                setTimeout(() => {
                  const headerHeight = document.querySelector('.doc-header').offsetHeight;
                  window.scrollBy(0, -headerHeight - 10);
                }, 100);
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
              scrollYOffset: 70,
              hideDownloadButton: false,
              expandResponses: '200,201',
              jsonSampleExpandLevel: 2,
              theme: {
                spacing: {
                  unit: 5,
                  sectionHorizontal: 40,
                  sectionVertical: 40,
                },
                breakpoints: {
                  small: '50rem',
                  medium: '85rem',
                  large: '105rem',
                },
                colors: {
                  tonalOffset: 0.3,
                  primary: {
                    main: '#4f46e5',
                    light: '#818cf8',
                    dark: '#3730a3',
                    contrastText: '#ffffff',
                  },
                  success: {
                    main: '#10b981',
                    light: '#6ee7b7',
                    dark: '#047857',
                    contrastText: '#ffffff',
                  },
                  warning: {
                    main: '#f59e0b',
                    light: '#fbbf24',
                    dark: '#d97706',
                    contrastText: '#ffffff',
                  },
                  error: {
                    main: '#ef4444',
                    light: '#f87171',
                    dark: '#dc2626',
                    contrastText: '#ffffff',
                  },
                  text: {
                    primary: '#0f172a',
                    secondary: '#475569',
                  },
                  border: {
                    dark: '#cbd5e1',
                    light: '#e2e8f0',
                  },
                  responses: {
                    success: {
                      color: '#10b981',
                      backgroundColor: '#d1fae5',
                    },
                    error: {
                      color: '#ef4444',
                      backgroundColor: '#fee2e2',
                    },
                    redirect: {
                      color: '#3b82f6',
                      backgroundColor: '#dbeafe',
                    },
                    info: {
                      color: '#0ea5e9',
                      backgroundColor: '#e0f2fe',
                    },
                  },
                  http: {
                    get: '#10b981',
                    post: '#3b82f6',
                    put: '#f59e0b',
                    options: '#8b5cf6',
                    patch: '#ec4899',
                    delete: '#ef4444',
                    basic: '#64748b',
                    link: '#06b6d4',
                    head: '#6366f1',
                  },
                },
                sidebar: {
                  backgroundColor: '#1e293b',
                  textColor: '#cbd5e1',
                  activeTextColor: '#ffffff',
                  groupItems: {
                    activeBackgroundColor: 'rgba(79, 70, 229, 0.15)',
                    activeTextColor: '#ffffff',
                    textTransform: 'none',
                  },
                  level1Items: {
                    activeBackgroundColor: 'rgba(79, 70, 229, 0.2)',
                    activeTextColor: '#ffffff',
                    textTransform: 'none',
                  },
                  arrow: {
                    size: '1.2em',
                    color: '#94a3b8',
                  },
                },
                typography: {
                  fontSize: '16px',
                  lineHeight: '1.7',
                  fontWeightRegular: '400',
                  fontWeightBold: '600',
                  fontWeightLight: '300',
                  fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  smoothing: 'antialiased',
                  optimizeSpeed: false,
                  headings: {
                    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontWeight: '700',
                    lineHeight: '1.4',
                  },
                  code: {
                    fontSize: '14px',
                    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                    lineHeight: '1.6',
                    fontWeight: '400',
                    color: '#0f172a',
                    backgroundColor: '#f1f5f9',
                    wrap: false,
                  },
                  links: {
                    color: '#4f46e5',
                    visited: '#4f46e5',
                    hover: '#4338ca',
                    textDecoration: 'none',
                    hoverTextDecoration: 'underline',
                  },
                },
                rightPanel: {
                  backgroundColor: '#0f172a',
                  width: '40%',
                  textColor: '#e2e8f0',
                },
                codeBlock: {
                  backgroundColor: '#1e293b',
                },
              },
            },
            container,
          ).then(() => {
            console.log('Redoc initialized successfully');
          }).catch((error) => {
            console.error('Failed to initialize Redoc:', error);
            document.getElementById('redoc-container').innerText =
              'Gagal memuat dokumentasi. Silakan refresh halaman.';
          });
        } else {
          document.getElementById('redoc-container').innerText =
            'Gagal memuat dokumentasi. Redoc library tidak tersedia.';
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
