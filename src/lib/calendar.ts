export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_CALENDAR_TIMEZONE = "Asia/Jakarta";

const pad2 = (value: string | number) => String(value).trim().padStart(2, "0");

export type CalendarMethod = "standar" | "islamic-umalqura" | "islamic-civil";
export type CalendarId = "islamic" | "islamic-umalqura" | "islamic-civil";

export type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type CalendarSelection = {
  method: CalendarMethod;
  calendar: CalendarId;
};

export type DateInfo = {
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

export const safeCalendarTimeZone = (value?: string | null) => {
  const input = (value ?? "").trim();
  if (!input) return DEFAULT_CALENDAR_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input });
    return input;
  } catch {
    return DEFAULT_CALENDAR_TIMEZONE;
  }
};

export const parseAdjustment = (value?: string | null) => {
  if (!value) return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.trunc(num);
};

export const parseGregorianDate = (value: string): DateParts | null => {
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

export const parseHijriDate = (value: string): DateParts | null => {
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

export const getGregorianParts = (date: Date, timeZone: string): DateParts => {
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

export const createZonedDate = (parts: DateParts, timeZone: string) => {
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

export const shiftZonedDate = (date: Date, days: number, timeZone: string) => {
  if (days === 0) return date;
  const shifted = new Date(date.getTime() + days * DAY_MS);
  const parts = getGregorianParts(shifted, timeZone);
  return createZonedDate(parts, timeZone);
};

export const buildCeInfo = (date: Date, timeZone: string): DateInfo => {
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

export const buildHijriInfo = (
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

export const convertHijriToGregorian = (
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

export const parseCalendarMethod = (
  value?: string | null,
): CalendarSelection => {
  if (!value) return methodMap.standar;
  const key = value.trim().toLowerCase();
  return methodMap[key] ?? methodMap.standar;
};

/**
 * Get the current Hijri year based on the given timezone
 */
export const getCurrentHijriYear = (
  timeZone: string = DEFAULT_CALENDAR_TIMEZONE,
  calendar: CalendarId = "islamic",
): number => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    year: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  return year ? Number(year) : 1446; // fallback to a reasonable default
};

/**
 * Get Ramadan periods (month 9) that fall within a given CE year
 * Returns array of {year, month} for Gregorian calendar
 * A CE year can contain 1 or 2 Ramadan months
 */
export const getRamadanMonthsForCeYear = (
  ceYear: number,
  calendar: CalendarId = "islamic",
  timeZone: string = DEFAULT_CALENDAR_TIMEZONE,
): Array<{ year: string; month: string }> => {
  const results: Array<{ year: string; month: string }> = [];
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar,
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
  });

  // Check each month of the CE year
  for (let month = 1; month <= 12; month++) {
    // Check beginning and end of each month
    for (let day = 1; day <= 28; day += 14) {
      const date = createZonedDate({ year: ceYear, month, day }, timeZone);
      const parts = extractParts(formatter.formatToParts(date));

      // Month 9 is Ramadan in Islamic calendar
      if (parts.month === 9) {
        // Avoid duplicates
        if (
          !results.some((r) =>
            r.year === String(ceYear) && r.month === pad2(month)
          )
        ) {
          results.push({ year: String(ceYear), month: pad2(month) });
        }
      }
    }
  }

  return results;
};

/**
 * Convert Hijri year to CE year/month for Ramadan (month 9)
 * Returns the CE year and month when Ramadan 1st falls
 */
export const convertRamadanHijriToCe = (
  hijriYear: number,
  calendar: CalendarId = "islamic",
  timeZone: string = DEFAULT_CALENDAR_TIMEZONE,
): { year: string; month: string } | null => {
  // Ramadan is month 9, day 1
  const ramadanStart = convertHijriToGregorian(
    { year: hijriYear, month: 9, day: 1 },
    calendar,
    timeZone,
  );

  if (!ramadanStart) return null;

  const parts = getGregorianParts(ramadanStart, timeZone);
  return {
    year: String(parts.year),
    month: pad2(parts.month),
  };
};
