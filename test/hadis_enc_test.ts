import { assertEquals } from "@std/assert";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerHadisEncRoutes } from "~/routes/hadis_enc.ts";
import { createHadisEncService } from "~/services/hadis_enc.ts";
import type { HadisEncDetail } from "~/services/hadis_enc.ts";
import type { AppEnv } from "~/types.ts";
import { hadisEncConfig } from "~/config/hadis_enc.ts";

type ApiResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

type HadisExploreResponse = {
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
  hadis: Omit<HadisEncDetail, "prev" | "next">[];
};

const fixturesBaseUrl = new URL("./fixtures/", import.meta.url);

const fixturePath = (name: string) =>
  decodeURIComponent(new URL(name, fixturesBaseUrl).pathname);

const withHadisEncApp = async (
  fixtureName: string,
  fn: (app: OpenAPIHono<AppEnv>) => Promise<void>,
) => {
  const dbPath = fixturePath(fixtureName);
  const service = createHadisEncService(dbPath);
  const app = new OpenAPIHono<AppEnv>();
  registerHadisEncRoutes({
    app,
    hadisEncService: service,
    docBaseUrl: "https://doc.test",
  });

  try {
    await fn(app);
  } finally {
    service.close();
  }
};

Deno.test("GET /hadis/enc returns metadata info", async () => {
  await withHadisEncApp("hadis_enc_multi.sqlite", async (app) => {
    const res = await app.request("/hadis/enc");
    const body = (await res.json()) as ApiResponse<{
      name: string;
      desc: string;
      lang: string;
      ver: string;
      last_update: string;
      source: string;
    }>;
    assertEquals(res.status, 200);
    assertEquals(body.data.name, "Ensiklopedia Hadis");
    assertEquals(body.data.desc, "Ensiklopedia Terjemahan Hadis-hadis Nabi");
    assertEquals(body.data.lang, "Indonesia");
    assertEquals(body.data.ver, hadisEncConfig.version);
    assertEquals(body.data.last_update, hadisEncConfig.lastUpdate);
    assertEquals(body.data.source, "hadeethenc.com");
  });
});

Deno.test("detail, next, and prev endpoints read from the database", async () => {
  await withHadisEncApp("hadis_enc_multi.sqlite", async (app) => {
    const detailRes = await app.request("/hadis/enc/show/11");
    const detailBody = (await detailRes.json()) as ApiResponse<HadisEncDetail>;
    assertEquals(detailRes.status, 200);
    assertEquals(detailBody.data.id, 11);
    assertEquals(detailBody.data.prev, 10);
    assertEquals(detailBody.data.next, 12);
    assertEquals(detailBody.data.grade, "Hasan");
    assertEquals(detailBody.data.takhrij, "HR. Muslim");
    assertEquals(detailBody.data.hikmah, "Hikmah penting");
    assertEquals(detailBody.data.text.id, "ID 11");

    const nextRes = await app.request("/hadis/enc/next/10");
    const nextBody = (await nextRes.json()) as ApiResponse<HadisEncDetail>;
    assertEquals(nextRes.status, 200);
    assertEquals(nextBody.data.id, 11);

    const prevRes = await app.request("/hadis/enc/prev/12");
    const prevBody = (await prevRes.json()) as ApiResponse<HadisEncDetail>;
    assertEquals(prevRes.status, 200);
    assertEquals(prevBody.data.id, 11);
  });
});

Deno.test("GET /hadis/enc/random returns the only available hadis", async () => {
  await withHadisEncApp("hadis_enc_single.sqlite", async (app) => {
    const res = await app.request("/hadis/enc/random");
    const body = (await res.json()) as ApiResponse<HadisEncDetail>;
    assertEquals(res.status, 200);
    assertEquals(body.data.id, 99);
    assertEquals(body.data.prev, null);
    assertEquals(body.data.next, null);
    assertEquals(body.data.text.id, "ID 99");
  });
});

Deno.test("GET /hadis/enc/explore paginates results", async () => {
  await withHadisEncApp("hadis_enc_multi.sqlite", async (app) => {
    const res = await app.request("/hadis/enc/explore?page=2&limit=3");
    const body = (await res.json()) as ApiResponse<HadisExploreResponse>;
    assertEquals(res.status, 200);
    assertEquals(body.data.paging.current, 2);
    assertEquals(body.data.paging.per_page, 3);
    assertEquals(body.data.paging.total_pages, 2);
    assertEquals(body.data.paging.total_data, 6);
    assertEquals(body.data.paging.has_prev, true);
    assertEquals(body.data.paging.has_next, false);
    assertEquals(
      body.data.hadis.map((entry) => entry.id),
      [13, 14, 15],
    );
  });
});
