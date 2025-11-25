import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCurlSample } from "~/lib/docs.ts";
import { getQiblaDirection, parseQiblaCoordinate } from "~/services/qibla.ts";
import type { AppEnv } from "~/types.ts";

const coordinateSchema = z.object({
  coordinate: z.string().openapi({
    example: "-6.200000,106.816666",
    description: "Koordinat latitude,longitude (derajat desimal).",
  }),
});

const qiblaDataSchema = z
  .object({
    latitude: z.number().openapi({ example: -6.2 }),
    longitude: z.number().openapi({ example: 106.816666 }),
    direction: z.number().openapi({
      example: 295.02,
      description: "Arah kiblat dalam derajat dari utara searah jarum jam.",
    }),
  })
  .openapi("QiblaData");

const qiblaSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: qiblaDataSchema,
  })
  .openapi("QiblaResponse");

const qiblaErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Koordinat tidak valid." }),
  })
  .openapi("QiblaError");

type RegisterQiblaDeps = {
  app: OpenAPIHono<AppEnv>;
  docBaseUrl: string;
};

export const registerQiblaRoutes = ({ app, docBaseUrl }: RegisterQiblaDeps) => {
  const jakartaCoordinate = "-6.200000,106.816666";
  const qiblaRoute = createRoute({
    method: "get",
    path: "/qibla/{coordinate}",
    summary: "Arah Kiblat",
    description:
      "Menghitung arah kiblat (derajat) berdasarkan koordinat latitude,longitude dalam format derajat desimal.",
    tags: ["Qibla"],
    request: { params: coordinateSchema },
    responses: {
      200: {
        description: "Arah kiblat berhasil dihitung.",
        content: { "application/json": { schema: qiblaSuccessSchema } },
      },
      400: {
        description: "Koordinat tidak valid.",
        content: { "application/json": { schema: qiblaErrorSchema } },
      },
    },
    "x-codeSamples": [
      {
        lang: "curl",
        label: "cURL",
        source: buildCurlSample(docBaseUrl, "GET", `/qibla/${jakartaCoordinate}`),
      },
    ],
  });

  app.openapi(qiblaRoute, (c) => {
    const { coordinate } = c.req.valid("param");
    const parsed = parseQiblaCoordinate(coordinate);
    if (!parsed) {
      return c.json({ status: false, message: "Koordinat tidak valid." }, 400);
    }
    const direction = getQiblaDirection(parsed);
    return c.json({
      status: true,
      message: "success",
      data: { latitude: parsed.latitude, longitude: parsed.longitude, direction },
    });
  });
};
