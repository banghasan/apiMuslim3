export const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

export const buildCurlSample = (
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: string,
) => {
  const normalizedBase = normalizeBaseUrl(baseUrl || "");
  const prefix = path.startsWith("/") ? "" : "/";
  const url = `${normalizedBase}${prefix}${path}`;
  const suffix = " | jq";
  if (method === "POST") {
    if (body) {
      return `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${body}'${suffix}`;
    }
    return `curl -s -X POST "${url}"${suffix}`;
  }
  return `curl -s "${url}"${suffix}`;
};
