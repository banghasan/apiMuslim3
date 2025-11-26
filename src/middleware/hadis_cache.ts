import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "~/types.ts";

type CacheEntry = {
  expiresAt: number;
  status: number;
  headers: [string, string][];
  body: Uint8Array;
};

const createResponseFromCache = (entry: CacheEntry) => {
  const headers = new Headers();
  for (const [key, value] of entry.headers) {
    headers.append(key, value);
  }
  headers.set("x-cache", "hadis-hit");
  return new Response(entry.body.slice(0), {
    status: entry.status,
    headers,
  });
};

const shouldCacheResponse = (res: Response) =>
  res.status === 200 && res.headers.get("cache-control") !== "no-store";

export const createHadisCacheMiddleware = (
  ttlMs: number,
): MiddlewareHandler<AppEnv> => {
  const cache = new Map<string, CacheEntry>();

  return async (c, next) => {
    if (c.req.method !== "GET") {
      return next();
    }
    const key = c.req.url;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return createResponseFromCache(cached);
    }

    const res = await next();
    if (!res || !shouldCacheResponse(res)) {
      return res;
    }

    const buffer = new Uint8Array(await res.clone().arrayBuffer());
    const headers: [string, string][] = [];
    res.headers.forEach((value, header) => headers.push([header, value]));
    cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      status: res.status,
      headers,
      body: buffer,
    });
    return res;
  };
};
