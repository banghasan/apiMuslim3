import type { MiddlewareHandler } from "hono";
import type { StatsService } from "~/services/stats.ts";
import type { AppEnv } from "~/types.ts";

export const createStatsRecorder = (
  statsService: StatsService,
): MiddlewareHandler<AppEnv> => {
  const enqueue = (stamp: Date) => {
    queueMicrotask(() => {
      try {
        statsService.incrementHit(stamp);
      } catch (error) {
        console.error("Failed to store hit statistic", error);
      }
    });
  };

  const middleware: MiddlewareHandler<AppEnv> = async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip");
    let ip = forwarded?.split(",")[0].trim();
    if (!ip) {
      const addr = c.env?.connInfo?.remoteAddr as
        | Deno.NetAddr
        | Deno.UnixAddr
        | undefined;
      if (addr && typeof addr === "object" && "hostname" in addr) {
        ip = addr.hostname;
      }
    }
    if (!ip) ip = "unknown";

    if (ip !== "127.0.0.1") {
      enqueue(new Date());
    }

    await next();
  };

  return middleware;
};
