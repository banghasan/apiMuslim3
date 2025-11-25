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

  const middleware: MiddlewareHandler<AppEnv> = async (_c, next) => {
    enqueue(new Date());
    await next();
  };

  return middleware;
};
