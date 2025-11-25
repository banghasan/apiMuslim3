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
  if (method === "POST") {
    if (body) {
      return `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${body}'`;
    }
    return `curl -s -X POST "${url}"`;
  }
  return `curl -s "${url}"`;
};
