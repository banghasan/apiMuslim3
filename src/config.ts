import "@std/dotenv/load";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

export const APP_VERSION = "v3.0.0";

export type AppConfig = {
  version: string;
  env: string;
  host: string;
  port: number;
  timezone: string;
  docBaseUrl: string;
  logVerbose: boolean;
  logWrite: boolean;
  enableCache: boolean;
  mapsCoApiKey: string;
  meiliHost: string;
  meiliApiKey: string;
};

export const loadConfig = (): AppConfig => {
  const env = (Deno.env.get("APP_ENV") ?? "development").toLowerCase();
  const host = Deno.env.get("HOST") ?? "127.0.0.1";
  const port = Number(Deno.env.get("PORT") ?? "8000");
  const version = Deno.env.get("APP_VERSION") ?? APP_VERSION;
  const docHost = host === "0.0.0.0" ? "localhost" : host;
  const defaultBaseUrl = `http://${docHost}:${port}`;
  const docBaseUrl = Deno.env.get("DOC_BASE_URL") ?? defaultBaseUrl;
  const timezone = Deno.env.get("TIMEZONE") ?? "Asia/Jakarta";
  const logVerbose = parseBoolean(Deno.env.get("LOG_VERBOSE"), false);
  const logWrite = parseBoolean(Deno.env.get("LOG_WRITE"), false);
  const enableCache = env === "production";
  const mapsCoApiKey = Deno.env.get("MAPSCO_API_KEY") ?? "";
  const meiliHost = Deno.env.get("MEILISEARCH_HOST") ?? "";
  const meiliApiKey = Deno.env.get("MEILISEARCH_API_KEY") ?? "";
  return {
    version,
    env,
    host,
    port,
    timezone,
    docBaseUrl,
    logVerbose,
    logWrite,
    enableCache,
    mapsCoApiKey,
    meiliHost,
    meiliApiKey,
  };
};

export const config = loadConfig();
