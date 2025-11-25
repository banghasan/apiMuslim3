import { assertEquals } from "@std/assert";
import { resolveClientIp } from "../src/services/tools.ts";

type HeaderMap = Record<string, string | undefined>;

const createSource = (headers: HeaderMap, hostname?: string) => ({
  header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
  remoteAddr: hostname ? { hostname } as Deno.NetAddr : undefined,
});

Deno.test("resolveClientIp prioritizes Cloudflare and forwarded headers", () => {
  const src = createSource({
    "x-forwarded-for": "198.51.100.5, 198.51.100.6",
    "cf-connecting-ip": "203.0.113.9",
  });
  const result = resolveClientIp(src);
  if (!result) throw new Error("IP not resolved");
  assertEquals(result.ip, "203.0.113.9");
  assertEquals(result.source, "cf-connecting-ip");
});

Deno.test("resolveClientIp falls back to remote address", () => {
  const src = createSource({}, "192.0.2.10");
  const result = resolveClientIp(src);
  if (!result) throw new Error("IP not resolved");
  assertEquals(result.ip, "192.0.2.10");
  assertEquals(result.source, "remote");
});
