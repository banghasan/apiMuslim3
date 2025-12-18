import type { MiddlewareHandler } from "hono";
import type { AppConfig } from "~/config.ts";
import type { AppEnv } from "~/types.ts";

const logDir = new URL("../../data/log/", import.meta.url);
await Deno.mkdir(logDir, { recursive: true });

const defaultLogRetentionDays = 30;
let logRetentionMs = defaultLogRetentionDays * 24 * 60 * 60 * 1000;
let logCleanupStarted = false;

const cleanupExpiredLogs = async () => {
  const now = Date.now();
  for await (const entry of Deno.readDir(logDir)) {
    if (!entry.isFile) continue;
    const match = /^([0-9]{4})([0-9]{2})([0-9]{2})\.log$/.exec(entry.name);
    if (!match) continue;
    const [, year, month, day] = match;
    const logDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (Number.isNaN(logDate.getTime())) continue;
    if (now - logDate.getTime() <= logRetentionMs) continue;
    try {
      await Deno.remove(new URL(entry.name, logDir));
    } catch (error) {
      console.warn(`Failed to delete expired log ${entry.name}`, error);
    }
  }
};

const startLogCleanup = (retentionDays: number) => {
  if (logCleanupStarted) return;
  logCleanupStarted = true;
  const normalizedDays = Number.isFinite(retentionDays) && retentionDays > 0
    ? Math.floor(retentionDays)
    : defaultLogRetentionDays;
  logRetentionMs = normalizedDays * 24 * 60 * 60 * 1000;
  const runCleanup = async () => {
    try {
      await cleanupExpiredLogs();
    } catch (error) {
      console.error("Failed to cleanup log files", error);
    }
  };
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000);
};

type AccessLogEntry = { line: string; stamp: Date };

const createFormatters = (timezone: string) => {
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
  return { timeFormatter, dateFormatter };
};

export const createAccessLogger = (
  config: AppConfig,
): MiddlewareHandler<AppEnv> => {
  if (config.logWrite) startLogCleanup(config.logRetentionDays);
  const { timeFormatter, dateFormatter } = createFormatters(config.timezone);
  const formatTimestamp = (value = new Date()) =>
    timeFormatter?.format(value) ?? value.toISOString();
  const formatLogDate = (value: Date) =>
    (dateFormatter?.format(value) ?? value.toISOString().slice(0, 10))
      .replaceAll(
        "-",
        "",
      );
  const logQueue: AccessLogEntry[] = [];
  let logFlushScheduled = false;
  const flushAccessLogs = async () => {
    while (logQueue.length) {
      const entry = logQueue.shift()!;
      const fileUrl = new URL(`${formatLogDate(entry.stamp)}.log`, logDir);
      try {
        await Deno.writeTextFile(fileUrl, `${entry.line}\n`, { append: true });
      } catch (error) {
        console.error("Failed to write access log", error);
      }
    }
  };
  const scheduleLogFlush = () => {
    if (!config.logWrite || logFlushScheduled) return;
    logFlushScheduled = true;
    setTimeout(async () => {
      try {
        await flushAccessLogs();
      } finally {
        logFlushScheduled = false;
        if (logQueue.length) scheduleLogFlush();
      }
    }, 0);
  };
  const enqueueAccessLog = (line: string, stamp: Date) => {
    if (!config.logWrite) return;
    logQueue.push({ line, stamp });
    scheduleLogFlush();
  };

  const accessLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
    const start = performance.now();
    await next();
    const forwarded = c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip");
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

    if (ip === "127.0.0.1") return;

    const rt = (performance.now() - start).toFixed(2);
    const logTime = new Date();
    const line = `${
      formatTimestamp(logTime)
    } [${c.res.status}] ${ip} ${c.req.method} ${c.req.path} ${rt}ms`;

    // Warna berdasarkan status respons
    const getColorCode = (status: number): string => {
      if (status >= 200 && status < 300) {
        return "\x1b[0m"; // kasih normal aja // 37 Putih untuk 2xx
      } else if (status >= 300 && status < 400) {
        return "\x1b[33m"; // Kuning untuk 3xx
      } else if (status >= 400 && status < 500) {
        return "\x1b[31m"; // Merah untuk 4xx
      } else if (status >= 500) {
        return "\x1b[35m"; // Magenta untuk 5xx
      }
      return "\x1b[36m"; // Cyan untuk status lain
    };

    const resetColor = "\x1b[0m"; // Reset warna
    const coloredLine = `${getColorCode(c.res.status)}${line}${resetColor}`;

    if (config.logVerbose) {
      console.log(coloredLine);
    }
    enqueueAccessLog(line, logTime);
  };

  return accessLogger;
};
