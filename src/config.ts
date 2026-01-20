import "@std/dotenv/load";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
};

export const APP_VERSION = "v3.1.0";

export type AppConfig = {
  version: string;
  env: string;
  host: string;
  port: number;
  timezone: string;
  docBaseUrl: string;
  logVerbose: boolean;
  logWrite: boolean;
  logRetentionDays: number;
  enableCache: boolean;
  mapsCoApiKey: string;
  meiliHost: string;
  meiliApiKey: string;
};

export const loadConfig = (): AppConfig => {
  const env = (Deno.env.get("APP_ENV") ?? "development").toLowerCase();
  const host = Deno.env.get("HOST") ?? "0.0.0.0";
  const port = Number(Deno.env.get("PORT") ?? "8000");
  const version = Deno.env.get("APP_VERSION") ?? APP_VERSION;
  const docHost = host === "0.0.0.0" ? "localhost" : host;
  const defaultBaseUrl = `http://${docHost}:${port}`;
  const docBaseUrl = Deno.env.get("DOC_BASE_URL") ?? defaultBaseUrl;
  const timezone = Deno.env.get("TIMEZONE") ?? "Asia/Jakarta";
  const logVerbose = parseBoolean(Deno.env.get("LOG_VERBOSE"), false);
  const logWrite = parseBoolean(Deno.env.get("LOG_WRITE"), false);
  const logRetentionDays = parsePositiveInt(
    Deno.env.get("LOG_RETENTION_DAYS"),
    30,
  );
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
    logRetentionDays,
    enableCache,
    mapsCoApiKey,
    meiliHost,
    meiliApiKey,
  };
};

export const config = loadConfig();
