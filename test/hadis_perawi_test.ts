import { assertEquals } from "@std/assert";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerHadisPerawiRoutes } from "~/routes/hadis_perawi.ts";
import { createHadisPerawiService } from "~/services/hadis_perawi.ts";
import type { AppEnv } from "~/types.ts";
import { hadisPerawiConfig } from "~/config/hadis_perawi.ts";

type ApiResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type PerawiEntry = {
  id: number;
  name: string | null;
  grade: string | null;
};

type PerawiBrowseData = {
  paging: {
    current: number;
    per_page: number;
    total_data: number;
    total_pages: number;
    has_prev: boolean;
    has_next: boolean;
    next_page: number | null;
    prev_page: number | null;
    first_page: number | null;
    last_page: number | null;
  };
  rawi: PerawiEntry[];
};

const fixturePath = decodeURIComponent(
  new URL("./fixtures/hadis_perawi_small.sqlite", import.meta.url)
    .pathname,
);

const withPerawiApp = async (
  handler: (app: OpenAPIHono<AppEnv>) => Promise<void>,
) => {
  const service = createHadisPerawiService(fixturePath);
  const app = new OpenAPIHono<AppEnv>();
  registerHadisPerawiRoutes({
    app,
    hadisPerawiService: service,
    docBaseUrl: "https://doc.test",
  });

  try {
    await handler(app);
  } finally {
    service.close();
  }
};

Deno.test("GET /hadis/perawi returns summary info", async () => {
  await withPerawiApp(async (app) => {
    const res = await app.request("/hadis/perawi");
    const body = (await res.json()) as ApiResponse<{
      total: number;
      last_update: string;
      sumber: string;
    }>;
    assertEquals(res.status, 200);
    assertEquals(body.status, true);
    assertEquals(body.message, "Daftar Semua Perawi");
    assertEquals(body.data.total, 3);
    assertEquals(body.data.last_update, hadisPerawiConfig.lastUpdate);
    assertEquals(body.data.sumber, hadisPerawiConfig.sumber);
  });
});

Deno.test("GET /hadist/perawi/id/{id} returns detail when found", async () => {
  await withPerawiApp(async (app) => {
    const res = await app.request("/hadist/perawi/id/10");
    const body = (await res.json()) as ApiResponse<PerawiEntry>;
    assertEquals(res.status, 200);
    assertEquals(body.status, true);
    assertEquals(body.data.id, 10);
    assertEquals(body.data.name, "Rawi Pertama");
    assertEquals(body.data.grade, "Siqah");
  });
});

Deno.test("GET /hadist/perawi/id/{id} rejects invalid id input", async () => {
  await withPerawiApp(async (app) => {
    const res = await app.request("/hadist/perawi/id/abc");
    const body = await res.json();
    assertEquals(res.status, 400);
    assertEquals(body.status, false);
  });
});

Deno.test("GET /hadist/perawi/browse paginates results", async () => {
  await withPerawiApp(async (app) => {
    const res = await app.request("/hadist/perawi/browse?page=2&limit=1");
    const body = (await res.json()) as ApiResponse<PerawiBrowseData>;
    assertEquals(res.status, 200);
    assertEquals(body.status, true);
    assertEquals(body.data.paging.current, 2);
    assertEquals(body.data.paging.per_page, 1);
    assertEquals(body.data.paging.total_data, 3);
    assertEquals(body.data.paging.total_pages, 3);
    assertEquals(body.data.rawi[0].id, 11);
  });
});
