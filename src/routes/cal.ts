import type { Context } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "~/types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = "Asia/Jakarta";

type CalendarMethod = "standar" | "islamic-umalqura" | "islamic-civil";
type CalendarId = "islamic" | "islamic-umalqura" | "islamic-civil";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type CalendarSelection = {
  method: CalendarMethod;
  calendar: CalendarId;
};

type DateInfo = {
  today: string;
  day: number;
  dayName: string;
  month: number;
  monthName: string;
  year: number;
};

const methodMap: Record<string, CalendarSelection> = {
  standar: { method: "standar", calendar: "islamic" },
  standard: { method: "standar", calendar: "islamic" },
  locale: { method: "standar", calendar: "islamic" },
  default: { method: "standar", calendar: "islamic" },
  islamic: { method: "standar", calendar: "islamic" },
  "islamic-umalqura": {
    method: "islamic-umalqura",
    calendar: "islamic-umalqura",
  },
  umalqura: { method: "islamic-umalqura", calendar: "islamic-umalqura" },
  "islamic-civil": { method: "islamic-civil", calendar: "islamic-civil" },
  civil: { method: "islamic-civil", calendar: "islamic-civil" },
};

const safeTimeZone = (value?: string | null) => {
  const input = (value ?? "").trim();
  if (!input) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input });
    return input;
  } catch {
    return DEFAULT_TIMEZONE;
  }
};

const parseAdjustment = (value?: string | null) => {
  if (!value) return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.trunc(num);
};

const parseGregorianDate = (value: string): DateParts | null => {
  const parts = value
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const [yearRaw, monthRaw, dayRaw] = parts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const base = new Date(Date.UTC(year, month - 1, day));
  if (
    base.getUTCFullYear() !== year ||
    base.getUTCMonth() + 1 !== month ||
    base.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

const parseHijriDate = (value: string): DateParts | null => {
  const parts = value
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const [yearRaw, monthRaw, dayRaw] = parts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  if (year < 1 || month < 1 || month > 12) return null;
  if (day < 1 || day > 30) return null;
  return { year, month, day };
};

const extractParts = (parts: Intl.DateTimeFormatPart[]): DateParts => {
  const getValue = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: getValue("year"),
    month: getValue("month"),
    day: getValue("day"),
  };
};

const getGregorianParts = (date: Date, timeZone: string): DateParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  return extractParts(formatter.formatToParts(date));
};

const createZonedDate = (parts: DateParts, timeZone: string) => {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offsetParts = offsetFormatter.formatToParts(base);
  const toNumber = (type: string) =>
    Number(offsetParts.find((part) => part.type === type)?.value ?? "0");
  const tzEpoch = Date.UTC(
    toNumber("year"),
    toNumber("month") - 1,
    toNumber("day"),
    toNumber("hour"),
    toNumber("minute"),
    toNumber("second"),
  );
  const offset = tzEpoch - base.getTime();
  return new Date(base.getTime() - offset);
};

const shiftZonedDate = (date: Date, days: number, timeZone: string) => {
  if (days === 0) return date;
  const shifted = new Date(date.getTime() + days * DAY_MS);
  const parts = getGregorianParts(shifted, timeZone);
  return createZonedDate(parts, timeZone);
};

const buildCeInfo = (date: Date, timeZone: string): DateInfo => {
  const displayFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const numericFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    weekday: "long",
  });
  const monthFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    month: "long",
  });
  const numeric = extractParts(numericFormatter.formatToParts(date));
  return {
    today: displayFormatter.format(date),
    day: numeric.day,
    dayName: weekdayFormatter.format(date),
    month: numeric.month,
    monthName: monthFormatter.format(date),
    year: numeric.year,
  };
};

const buildHijriInfo = (
  date: Date,
  timeZone: string,
  calendar: CalendarId,
): DateInfo => {
  const displayFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const numericFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    weekday: "long",
  });
  const monthFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    month: "long",
  });
  const numeric = extractParts(numericFormatter.formatToParts(date));
  return {
    today: displayFormatter.format(date),
    day: numeric.day,
    dayName: weekdayFormatter.format(date),
    month: numeric.month,
    monthName: monthFormatter.format(date),
    year: numeric.year,
  };
};

const compareParts = (a: DateParts, b: DateParts) => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
};

const convertHijriToGregorian = (
  target: DateParts,
  calendar: CalendarId,
  timeZone: string,
): Date | null => {
  const approxYear = Math.floor((target.year - 1) * 0.97) + 622;
  const startYear = Math.max(400, approxYear - 60);
  const endYear = approxYear + 60;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  let lowDay = Math.floor(Date.UTC(startYear, 0, 1) / DAY_MS);
  let highDay = Math.floor(Date.UTC(endYear, 11, 31) / DAY_MS);
  let found: Date | null = null;

  while (lowDay <= highDay) {
    const midDay = Math.floor((lowDay + highDay) / 2);
    const probe = new Date(midDay * DAY_MS + DAY_MS / 2);
    const parts = extractParts(formatter.formatToParts(probe));
    const diff = compareParts(parts, target);
    if (diff === 0) {
      found = probe;
      break;
    }
    if (diff < 0) {
      lowDay = midDay + 1;
    } else {
      highDay = midDay - 1;
    }
  }

  if (!found) return null;
  const gregorian = getGregorianParts(found, timeZone);
  return createZonedDate(gregorian, timeZone);
};

const parseCalendarMethod = (value?: string | null): CalendarSelection => {
  if (!value) return methodMap.standar;
  const key = value.trim().toLowerCase();
  return methodMap[key] ?? methodMap.standar;
};

const successResponse = (data: {
  method: CalendarMethod;
  adjustment: number;
  ce: DateInfo;
  hijr: DateInfo;
}) => ({
  status: true as const,
  message: "success",
  data,
});

const errorResponse = (message: string) => ({
  status: false as const,
  message,
});

const getCommonParams = (c: Context<AppEnv>) => {
  const queryMethod = c.req.query("method") ?? c.req.query("m");
  const queryTz = c.req.query("utc") ?? c.req.query("tz");
  const adjParam = c.req.query("adj");
  const selection = parseCalendarMethod(queryMethod);
  const timeZone = safeTimeZone(queryTz);
  const adjustment = parseAdjustment(adjParam);
  return { selection, timeZone, adjustment };
};

export const registerCalRoutes = (app: OpenAPIHono<AppEnv>) => {
  app.get("/cal/today", (c) => {
    const { selection, timeZone, adjustment } = getCommonParams(c);
    const now = new Date();
    const todayParts = getGregorianParts(now, timeZone);
    const todayDate = createZonedDate(todayParts, timeZone);
    const adjustedHijr = shiftZonedDate(todayDate, adjustment, timeZone);
    const ce = buildCeInfo(todayDate, timeZone);
    const hijr = buildHijriInfo(adjustedHijr, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  });

  app.get("/cal/hijr/:date", (c) => {
    const ceDate = parseGregorianDate(c.req.param("date"));
    if (!ceDate) {
      return c.json(
        errorResponse("Format tanggal Masehi tidak valid. Gunakan YYYY-MM-DD."),
        400,
      );
    }
    const { selection, timeZone, adjustment } = getCommonParams(c);
    const baseDate = createZonedDate(ceDate, timeZone);
    const hijrDate = shiftZonedDate(baseDate, adjustment, timeZone);
    const ce = buildCeInfo(baseDate, timeZone);
    const hijr = buildHijriInfo(hijrDate, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  });

  app.get("/cal/ce/:date", (c) => {
    const hijriDate = parseHijriDate(c.req.param("date"));
    if (!hijriDate) {
      return c.json(
        errorResponse(
          "Format tanggal hijriyah tidak valid. Gunakan YYYY-MM-DD.",
        ),
        400,
      );
    }
    const { selection, timeZone, adjustment } = getCommonParams(c);
    const baseDate = convertHijriToGregorian(
      hijriDate,
      selection.calendar,
      timeZone,
    );
    if (!baseDate) {
      return c.json(
        errorResponse(
          "Gagal mengkonversi tanggal hijriyah ke kalender Masehi untuk metode ini.",
        ),
        400,
      );
    }
    const ceDate = shiftZonedDate(baseDate, adjustment, timeZone);
    const ce = buildCeInfo(ceDate, timeZone);
    const hijr = buildHijriInfo(baseDate, timeZone, selection.calendar);
    return c.json(
      successResponse({
        method: selection.method,
        adjustment,
        ce,
        hijr,
      }),
    );
  });
};
