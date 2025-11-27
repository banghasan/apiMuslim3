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

export type UptimeBreakdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type SystemUptimeInfo = {
  uptimeSeconds: number;
  serverTime: Date;
  startedAt: Date;
  breakdown: UptimeBreakdown;
  humanReadable: string;
};

export const breakdownUptime = (seconds: number): UptimeBreakdown => {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const remainingSeconds = total % 60;
  return { days, hours, minutes, seconds: remainingSeconds };
};

export const formatUptime = (breakdown: UptimeBreakdown): string => {
  const segments: Array<{ value: number; label: string }> = [
    { value: breakdown.days, label: "hari" },
    { value: breakdown.hours, label: "jam" },
    { value: breakdown.minutes, label: "menit" },
    { value: breakdown.seconds, label: "detik" },
  ];
  const parts = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => `${segment.value} ${segment.label}`);
  if (!parts.length) {
    return "baru saja menyala";
  }
  return parts.join(", ");
};

export const getSystemUptime = (): SystemUptimeInfo => {
  const uptimeSeconds = Math.max(0, Math.floor(Deno.osUptime()));
  const serverTime = new Date();
  const startedAt = new Date(serverTime.getTime() - uptimeSeconds * 1000);
  const breakdown = breakdownUptime(uptimeSeconds);
  const humanReadable = formatUptime(breakdown);
  return {
    uptimeSeconds,
    serverTime,
    startedAt,
    breakdown,
    humanReadable,
  };
};
