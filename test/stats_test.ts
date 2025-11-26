import { assertEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerStatsRoutes } from "~/routes/stats.ts";
import type { StatsService } from "~/services/stats.ts";
import type { AppEnv } from "~/types.ts";

type StatsDetailResponse = {
  status: boolean;
  message: string;
  data: {
    avg: number;
    detail: { tahun: number; bulan: number; hits: number }[];
  };
};

type StatsListResponse = {
  status: boolean;
  message: string;
  data: { tahun: number; hits: number }[];
};

type StatsErrorResponse = {
  status: boolean;
  message: string;
};

const createStatsTestApp = () => {
  const yearDetailCalls: number[] = [];
  const yearlyStats = [
    { tahun: 2024, hits: 120 },
    { tahun: 2023, hits: 100 },
  ];

  const statsService: StatsService = {
    incrementHit: () => {},
    getYearDetail: (year) => {
      yearDetailCalls.push(year);
      return {
        avg: 15,
        detail: [
          { tahun: year, bulan: 1, hits: 10 },
          { tahun: year, bulan: 2, hits: 20 },
        ],
      };
    },
    getYearlyStats: () => yearlyStats,
    close: () => {},
  };

  const app = new OpenAPIHono<AppEnv>();
  registerStatsRoutes({
    app,
    docBaseUrl: "https://doc.example",
    statsService,
  });

  return { app, yearDetailCalls, yearlyStats };
};

Deno.test("GET /stats returns detail for the current year", async () => {
  const { app, yearDetailCalls } = createStatsTestApp();
  const fakeTime = new FakeTime("2028-01-15T00:00:00Z");
  try {
    const res = await app.request("/stats");
    const body = (await res.json()) as StatsDetailResponse;
    assertEquals(res.status, 200);
    assertEquals(body.status, true);
    assertEquals(body.message, "success");
    assertEquals(yearDetailCalls, [2028]);
    assertEquals(body.data.avg, 15);
    assertEquals(body.data.detail[0].tahun, 2028);
  } finally {
    fakeTime.restore();
  }
});

Deno.test("GET /stats/{year} rejects non numeric year params", async () => {
  const { app, yearDetailCalls } = createStatsTestApp();
  const res = await app.request("/stats/not-a-year");
  const body = (await res.json()) as StatsErrorResponse;
  assertEquals(res.status, 400);
  assertEquals(body.status, false);
  assertEquals(body.message, "Tahun tidak valid.");
  assertEquals(yearDetailCalls.length, 0);
});

Deno.test("GET /stats/{year} returns the requested year detail", async () => {
  const { app, yearDetailCalls } = createStatsTestApp();
  const res = await app.request("/stats/2023");
  const body = (await res.json()) as StatsDetailResponse;
  assertEquals(res.status, 200);
  assertEquals(body.status, true);
  assertEquals(yearDetailCalls, [2023]);
  for (const entry of body.data.detail) {
    assertEquals(entry.tahun, 2023);
  }
});

Deno.test("GET /stats/all returns yearly aggregates", async () => {
  const { app, yearlyStats } = createStatsTestApp();
  const res = await app.request("/stats/all");
  const body = (await res.json()) as StatsListResponse;
  assertEquals(res.status, 200);
  assertEquals(body.status, true);
  assertEquals(body.data, yearlyStats);
});
