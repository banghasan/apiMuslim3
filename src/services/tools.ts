export type IpDetectionSource = {
  header: (name: string) => string | undefined;
  remoteAddr?: Deno.NetAddr | Deno.UnixAddr;
};

export type IpDetectionResult = {
  ip: string;
  source: string;
};

const HEADER_PRIORITY = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
  "x-real-ip",
  "x-forwarded-for",
];

export const resolveClientIp = (
  source: IpDetectionSource,
): IpDetectionResult | null => {
  for (const header of HEADER_PRIORITY) {
    const value = source.header(header);
    if (!value) continue;
    const first = header === "x-forwarded-for"
      ? value.split(",")[0].trim()
      : value.trim();
    if (first) {
      return { ip: first, source: header };
    }
  }
  const addr = source.remoteAddr;
  if (addr && typeof addr === "object" && "hostname" in addr && addr.hostname) {
    return { ip: addr.hostname, source: "remote" };
  }
  return null;
};
