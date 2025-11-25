export type JadwalEntry = {
  tanggal: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

export type JadwalFileSource = {
  prov?: { text?: string };
  kab?: { text?: string };
  jadwal?: {
    prov?: string;
    kabko?: string;
    data?: Record<string, JadwalEntry>;
  };
};

export type JadwalResponseData = {
  id: string;
  kabko: string;
  prov: string;
  jadwal: Record<string, JadwalEntry>;
};

const appEnv = (Deno.env.get("APP_ENV") ?? "development").toLowerCase();
const isProdEnv = appEnv === "production";

export const DEFAULT_JADWAL_TIMEZONE = Deno.env.get("TIMEZONE") ??
  "Asia/Jakarta";

export const safeJadwalTimeZone = (value?: string | null) => {
  const input = (value ?? "").trim();
  if (!input) return DEFAULT_JADWAL_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input });
    return input;
  } catch {
    return DEFAULT_JADWAL_TIMEZONE;
  }
};

export const getTodayPeriod = (timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(new Date());
  const [year, month, day] = formatted.split("-");
  return {
    year,
    month,
    day,
    key: `${year}-${month}-${day}`,
  };
};

const pad2 = (value: string | number) => String(value).trim().padStart(2, "0");

export type SchedulePeriod =
  | { type: "monthly"; year: string; month: string }
  | { type: "daily"; year: string; month: string; day: string };

export const parseSchedulePeriod = (period: string): SchedulePeriod | null => {
  const parts = period
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2 && parts.length !== 3) return null;

  const [yearPart, monthPart, dayPart] = parts;
  if (!/^\d{4}$/.test(yearPart ?? "")) return null;

  const monthNum = Number(monthPart);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return null;
  const month = pad2(monthNum);

  if (parts.length === 2) {
    return { type: "monthly", year: yearPart!, month };
  }

  const dayNum = Number(dayPart);
  if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) return null;
  const day = pad2(dayNum);
  return { type: "daily", year: yearPart!, month, day };
};

const scheduleCache = new Map<string, JadwalResponseData>();
const schedulePending = new Map<string, Promise<JadwalResponseData | null>>();

const scheduleKey = (id: string, year: string, month: string) =>
  `${id}-${year}-${month}`;

export const loadScheduleFile = async (
  id: string,
  year: string,
  month: string,
): Promise<JadwalResponseData | null> => {
  const key = scheduleKey(id, year, month);
  if (isProdEnv && scheduleCache.has(key)) {
    return scheduleCache.get(key)!;
  }
  if (isProdEnv && schedulePending.has(key)) {
    return await schedulePending.get(key)!;
  }

  const loader = (async () => {
    const fileUrl = new URL(
      `../../data/sholat/jadwal/${year}/${id}-${year}-${month}.json`,
      import.meta.url,
    );
    try {
      const rawText = await Deno.readTextFile(fileUrl);
      const parsed = JSON.parse(rawText) as JadwalFileSource;
      const jadwalMap = parsed.jadwal?.data;
      if (!jadwalMap || typeof jadwalMap !== "object") {
        return null;
      }

      return {
        id,
        kabko: parsed.jadwal?.kabko ?? parsed.kab?.text ?? "",
        prov: parsed.jadwal?.prov ?? parsed.prov?.text ?? "",
        jadwal: jadwalMap,
      };
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return null;
      }
      console.error(
        `Failed to read schedule for ${id} ${year}-${month}:`,
        error,
      );
      return null;
    }
  })();

  if (isProdEnv) {
    schedulePending.set(key, loader);
  }
  const result = await loader;
  if (isProdEnv) {
    schedulePending.delete(key);
    if (result) {
      scheduleCache.set(key, result);
    }
  }
  return result;
};
