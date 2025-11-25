import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { buildCurlSample } from "~/lib/docs.ts";
import { resolveClientIp } from "~/services/tools.ts";
import type { AppEnv } from "~/types.ts";

const ipDataSchema = z
  .object({
    ip: z.string().openapi({ example: "203.0.113.10" }),
    source: z.string().openapi({ example: "x-forwarded-for" }),
    agent: z.string().openapi({ example: "Mozilla/5.0" }),
  })
  .openapi("IpInfo");

const ipSuccessSchema = z
  .object({
    status: z.literal(true).openapi({ example: true }),
    message: z.string().openapi({ example: "success" }),
    data: ipDataSchema,
  })
  .openapi("IpResponse");

const ipErrorSchema = z
  .object({
    status: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: "Tidak dapat menentukan IP." }),
  })
  .openapi("IpError");

type RegisterToolsDeps = {
  app: OpenAPIHono<AppEnv>;
  docBaseUrl: string;
};

export const registerToolsRoutes = ({ app, docBaseUrl }: RegisterToolsDeps) => {
  const ipRoute = createRoute({
    method: "get",
    path: "/tools/ip",
    summary: "Deteksi IP",
    description:
      "Mengembalikan alamat IP pengunjung beserta sumber deteksi (header proxy/remote) dan user agent.",
    tags: ["Tools"],
    responses: {
      200: {
        description: "Informasi IP tersedia.",
        content: { "application/json": { schema: ipSuccessSchema } },
      },
      400: {
        description: "IP tidak dapat ditentukan.",
        content: { "application/json": { schema: ipErrorSchema } },
      },
    },
    "x-codeSamples": [
      {
        lang: "curl",
        label: "cURL",
        source: buildCurlSample(docBaseUrl, "GET", "/tools/ip"),
      },
    ],
  });

  app.openapi(ipRoute, (c) => {
    const info = resolveClientIp({
      header: (name) => c.req.header(name) ?? undefined,
      remoteAddr: c.env?.connInfo?.remoteAddr as
        | Deno.NetAddr
        | Deno.UnixAddr
        | undefined,
    });
    if (!info) {
      return c.json(
        { status: false, message: "Tidak dapat menentukan IP." },
        400,
      );
    }
    const agent = c.req.header("user-agent") ?? "unknown";
    return c.json({
      status: true,
      message: "success",
      data: { ip: info.ip, source: info.source, agent },
    });
  });
};
