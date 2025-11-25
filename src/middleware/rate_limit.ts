import type { MiddlewareHandler } from "hono";
import type { RateLimitConfig, RateLimitRule } from "~/config/rate_limit.ts";
import type { AppEnv } from "~/types.ts";
import { resolveClientIp } from "~/services/tools.ts";

type Bucket = { count: number; resetAt: number };

const createKey = (ruleId: string, ip: string) => `${ruleId}:${ip}`;

const detectClientIp = (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => {
  const info = resolveClientIp({
    header: (name) => c.req.header(name) ?? undefined,
    remoteAddr: c.env?.connInfo?.remoteAddr as
      | Deno.NetAddr
      | Deno.UnixAddr
      | undefined,
  });
  return info?.ip ?? "unknown";
};

const selectRule = (
  config: RateLimitConfig,
  method: string,
  path: string,
): RateLimitRule => {
  for (const override of config.overrides) {
    const methodMatch = !override.methods ||
      override.methods.includes(method);
    if (!methodMatch) continue;
    if (override.pathPattern.test(path)) {
      return override;
    }
  }
  return config.default;
};

const toRetryAfterSeconds = (resetAt: number) =>
  Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

const buildLimitExceededMessage = (rule: RateLimitRule) => {
  const windowSeconds = Math.round(rule.windowMs / 1000);
  return `Terlalu banyak permintaan ${rule.label}. Batas ${rule.limit} permintaan per ${windowSeconds} detik.`;
};

export const createRateLimitMiddleware = (
  config: RateLimitConfig,
): MiddlewareHandler<AppEnv> => {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const ip = detectClientIp(c);
    const rule = selectRule(config, c.req.method, c.req.path);
    const key = createKey(rule.id, ip);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    const remaining = Math.max(0, rule.limit - bucket.count);
    const resetSeconds = Math.ceil(bucket.resetAt / 1000);

    if (bucket.count > rule.limit) {
      const retryAfter = toRetryAfterSeconds(bucket.resetAt);
      c.header("Retry-After", String(retryAfter), { append: false });
      c.header("RateLimit-Limit", String(rule.limit), { append: false });
      c.header("RateLimit-Remaining", "0", { append: false });
      c.header("RateLimit-Reset", String(resetSeconds), { append: false });
      return c.json(
        { status: false, message: buildLimitExceededMessage(rule) },
        429,
      );
    }

    c.header("RateLimit-Limit", String(rule.limit), { append: false });
    c.header("RateLimit-Remaining", String(remaining), { append: false });
    c.header("RateLimit-Reset", String(resetSeconds), { append: false });

    await next();
  };
};
