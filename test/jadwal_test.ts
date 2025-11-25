import { assert, assertEquals } from "@std/assert";
import type { AppConfig } from "../src/config.ts";
import {
  createJadwalService,
  parseSchedulePeriod,
} from "../src/services/jadwal.ts";

const SAMPLE_ID = "eda80a3d5b344bc40f3bc04f65b7a357";
const SAMPLE_YEAR = "2026";
const SAMPLE_MONTH = "06";

Deno.test("parseSchedulePeriod parses monthly and daily values", () => {
  const monthly = parseSchedulePeriod("2026-06");
  assert(monthly && monthly.type === "monthly");
  assertEquals(monthly.month, "06");
  const daily = parseSchedulePeriod("2026-06-23");
  assert(daily && daily.type === "daily");
  assertEquals(daily.day, "23");
  assertEquals(parseSchedulePeriod("2026-13"), null);
});

const baseConfig: AppConfig = {
  env: "test",
  host: "127.0.0.1",
  port: 8000,
  timezone: "Asia/Jakarta",
  docBaseUrl: "http://localhost:8000",
  logVerbose: false,
  logWrite: false,
  enableCache: false,
};

const defaultService = createJadwalService(baseConfig);

Deno.test("safeJadwalTimeZone validates input", () => {
  assertEquals(
    defaultService.safeJadwalTimeZone("Asia/Makassar"),
    "Asia/Makassar",
  );
  assertEquals(
    defaultService.safeJadwalTimeZone("invalid/zone"),
    "Asia/Jakarta",
  );
});

Deno.test("loadScheduleFile returns schedule data", async () => {
  const data = await defaultService.loadScheduleFile(
    SAMPLE_ID,
    SAMPLE_YEAR,
    SAMPLE_MONTH,
  );
  assert(data);
  assertEquals(data.id, SAMPLE_ID);
  assert(Object.keys(data.jadwal).length > 0);
});

Deno.test("loadScheduleFile caches results in production", async () => {
  const prodService = createJadwalService({ ...baseConfig, enableCache: true });
  const originalRead = Deno.readTextFile;
  let readCount = 0;
  // deno-lint-ignore no-explicit-any
  (Deno as any).readTextFile = async (
    ...args: Parameters<typeof Deno.readTextFile>
  ) => {
    readCount += 1;
    return await originalRead(...args);
  };
  try {
    const first = await prodService.loadScheduleFile(
      SAMPLE_ID,
      SAMPLE_YEAR,
      SAMPLE_MONTH,
    );
    const second = await prodService.loadScheduleFile(
      SAMPLE_ID,
      SAMPLE_YEAR,
      SAMPLE_MONTH,
    );
    assert(first && second);
    assertEquals(readCount, 1);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).readTextFile = originalRead;
  }
});
