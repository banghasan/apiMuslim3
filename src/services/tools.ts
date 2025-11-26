export type IpDetectionSource = {
  header: (name: string) => string | undefined;
  remoteAddr?: Deno.NetAddr | Deno.UnixAddr;
};

export type IpDetail = {
  ip: string;
  source: string;
};

export type IpDetectionResult = IpDetail & {
  details: IpDetail[];
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
  const details: IpDetail[] = [];
  let primary: IpDetail | null = null;
  for (const header of HEADER_PRIORITY) {
    const value = source.header(header);
    if (!value) continue;
    const first = header === "x-forwarded-for"
      ? value.split(",")[0].trim()
      : value.trim();
    if (!first) continue;
    const detail = { ip: first, source: header };
    details.push(detail);
    if (!primary) {
      primary = detail;
    }
  }
  const addr = source.remoteAddr;
  if (addr && typeof addr === "object" && "hostname" in addr && addr.hostname) {
    const remoteDetail: IpDetail = { ip: addr.hostname, source: "remote-addr" };
    details.push(remoteDetail);
    if (!primary) {
      primary = remoteDetail;
    }
  }
  if (!primary) {
    return null;
  }
  return { ...primary, details };
};
