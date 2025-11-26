import { assertEquals } from "@std/assert";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerHadisEncRoutes } from "~/routes/hadis_enc.ts";
import type {
  HadisEncExploreResult,
  HadisEncService,
} from "~/services/hadis_enc.ts";
import type {
  HadisSearchResult,
  HadisSearchService,
} from "~/services/hadis_search.ts";
import type { AppEnv } from "~/types.ts";

const createStubHadisEncService = (): HadisEncService => {
  const detail = {
    id: 1,
    text: { ar: "ar", id: "id" },
    grade: null,
    takhrij: null,
    hikmah: null,
    prev: null,
    next: null,
  };
  const exploreResult: HadisEncExploreResult = {
    paging: {
      current: 1,
      per_page: 5,
      total_data: 0,
      total_pages: 0,
      has_prev: false,
      has_next: false,
      next_page: null,
      prev_page: null,
      first_page: null,
      last_page: null,
    },
    hadis: [],
  };
  return {
    getById: () => detail,
    getNext: () => detail,
    getPrevious: () => detail,
    getRandom: () => detail,
    explore: () => exploreResult,
    close: () => {},
  };
};

const createApp = (searchService: HadisSearchService | null) => {
  const app = new OpenAPIHono<AppEnv>();
  registerHadisEncRoutes({
    app,
    docBaseUrl: "https://doc.test",
    hadisEncService: createStubHadisEncService(),
    hadisSearchService: searchService,
  });
  return app;
};

Deno.test("hadis search returns normalized keyword and paging info", async () => {
  const calls: Array<{ keyword: string; page: number; limit: number }> = [];
  const searchService: HadisSearchService = {
    search(keyword, page, limit): Promise<HadisSearchResult> {
      calls.push({ keyword, page, limit });
      return Promise.resolve({
        total: 23,
        hits: [
          {
            id: 2750,
            text:
              "Sholat khusyuk membawa ketenangan hati. Apabila sholat khusyuk dilakukan dengan ikhlas, kiamat terasa dekat.",
          },
        ],
      });
    },
  };
  const app = createApp(searchService);
  const res = await app.request(
    "/hadis/enc/cari/  sholat   khusyuk  ?page=2&limit=5",
  );
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.status, true);
  assertEquals(body.data.keyword, "sholat khusyuk");
  assertEquals(body.data.paging.current, 2);
  assertEquals(body.data.paging.per_page, 5);
  assertEquals(body.data.paging.total_pages, 5);
  assertEquals(body.data.hadis[0].id, 2750);
  assertEquals(body.data.hadis[0].focus.length > 0, true);
  const firstFocus = (body.data.hadis[0].focus[0] ?? "").toLowerCase();
  assertEquals(firstFocus.includes("sholat khusyuk"), true);
  assertEquals(calls, [{ keyword: "sholat khusyuk", page: 2, limit: 5 }]);
});

Deno.test("hadis search rejects keyword shorter than 4 chars", async () => {
  const app = createApp({
    search(): Promise<HadisSearchResult> {
      return Promise.reject(new Error("should not be called"));
    },
  });
  const res = await app.request("/hadis/enc/cari/abc?page=1&limit=10");
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.status, false);
});

Deno.test("hadis search returns 503 when service unavailable", async () => {
  const app = createApp(null);
  const res = await app.request("/hadis/enc/cari/shalat?page=1&limit=10");
  const body = await res.json();
  assertEquals(res.status, 503);
  assertEquals(body.status, false);
});
