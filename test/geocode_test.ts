import { assertEquals, assertRejects } from "@std/assert";
import { createGeocodeService } from "../src/services/geocode.ts";

const toUrl = (input: Request | URL | string) => {
  if (typeof input === "string") {
    return new URL(input);
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url);
};

const createJsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

Deno.test("geocode enqueue requires MAPSCO_API_KEY", async () => {
  const service = createGeocodeService("");
  await assertRejects(
    () => service.enqueue("Masjid Istiqlal"),
    Error,
    "MAPSCO_API_KEY missing",
  );
});

Deno.test("geocode requests are processed sequentially", async () => {
  let concurrent = 0;
  let maxConcurrent = 0;
  const order: Array<{ query: string | null; apiKey: string | null }> = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = toUrl(input);
    order.push({
      query: url.searchParams.get("q"),
      apiKey: url.searchParams.get("api_key"),
    });
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await Promise.resolve();
    concurrent -= 1;
    return createJsonResponse({ query: url.searchParams.get("q") });
  };

  const service = createGeocodeService("demo-key", {
    fetchImpl,
    immediateFlush: true,
  });

  await Promise.all([service.enqueue("pertama"), service.enqueue("kedua")]);

  assertEquals(order, [
    { query: "pertama", apiKey: "demo-key" },
    { query: "kedua", apiKey: "demo-key" },
  ]);
  assertEquals(maxConcurrent, 1);
});

Deno.test("geocode service rejects when queue limit is exceeded", async () => {
  const fetchImpl: typeof fetch = async () => createJsonResponse({});
  const service = createGeocodeService("queue-key", {
    fetchImpl,
    maxQueue: 0,
  });

  await assertRejects(() => service.enqueue("kedua"), Error, "QUEUE_OVERFLOW");
});
