import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCodeSamples } from "~/lib/docs.ts";
import type { AppConfig } from "~/config.ts";
import type { AppEnv } from "~/types.ts";

const healthDataSchema = z
  .object({
    serverTime: z.string().datetime().openapi({
      example: "2025-01-01T12:00:00.000Z",
    }),
    startedAt: z.string().datetime().openapi({
      example: "2025-01-01T08:00:00.000Z",
    }),
    uptimeSeconds: z.number().int().nonnegative().openapi({ example: 14400 }),
    env: z.string().openapi({ example: "production" }),
    timezone: z.string().openapi({ example: "Asia/Jakarta" }),
  })
  .openapi("HealthData");

const healthResponseSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "ok" }),
    data: healthDataSchema,
  })
  .openapi("HealthResponse");

type RegisterHealthDeps = {
  app: OpenAPIHono<AppEnv>;
  docBaseUrl: string;
  startedAt: Date;
  config: AppConfig;
};

export const registerHealthRoutes = ({
  app,
  docBaseUrl,
  startedAt,
  config,
}: RegisterHealthDeps) => {
  const healthRoute = createRoute({
    method: "get",
    path: "/health",
    summary: "Health Check",
    description:
      "Endpoint sederhana untuk memastikan API aktif. Merespon waktu server saat ini, waktu mulai aplikasi, serta uptime dalam hitungan detik.",
    tags: ["Tools"],
    responses: {
      200: {
        description: "Server berjalan normal.",
        content: { "application/json": { schema: healthResponseSchema } },
      },
    },
    "x-codeSamples": buildCodeSamples(docBaseUrl, "GET", "/health"),
  });

  app.openapi(healthRoute, (c) => {
    const now = new Date();
    const uptimeSeconds = Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / 1000),
    );
    return c.json({
      status: true,
      message: "ok",
      data: {
        serverTime: now.toISOString(),
        startedAt: startedAt.toISOString(),
        uptimeSeconds,
        env: config.env,
        timezone: config.timezone,
      },
    });
  });
};
