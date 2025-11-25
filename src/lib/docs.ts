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

const escapeSingleQuotes = (value: string) => value.replace(/'/g, "\\'");

const buildJavaScriptSample = (
  url: string,
  method: "GET" | "POST",
  body?: string,
) => {
  const lines = [
    `fetch("${url}", {`,
    `  method: "${method}",`,
    "  headers: {",
    '    "Accept": "application/json",',
    ...(method === "POST" ? ['    "Content-Type": "application/json",'] : []),
    "  },",
    ...(method === "POST" && body
      ? [`  body: '${escapeSingleQuotes(body)}',`]
      : []),
    "})",
    "  .then((response) => response.json())",
    "  .then((data) => console.log(data))",
    "  .catch((error) => console.error(error));",
  ];
  return lines.join("\n");
};

const buildPhpSample = (url: string, method: "GET" | "POST", body?: string) => {
  const headers = [
    '"Accept: application/json"',
    ...(method === "POST" ? ['"Content-Type: application/json"'] : []),
  ];
  const lines = [
    "<?php",
    "$curl = curl_init();",
    "",
    "curl_setopt_array($curl, [",
    `    CURLOPT_URL => "${url}",`,
    "    CURLOPT_RETURNTRANSFER => true,",
    `    CURLOPT_CUSTOMREQUEST => "${method}",`,
    `    CURLOPT_HTTPHEADER => [${headers.join(", ")}],`,
    ...(method === "POST" && body
      ? [`    CURLOPT_POSTFIELDS => '${escapeSingleQuotes(body)}',`]
      : []),
    "]);",
    "",
    "$response = curl_exec($curl);",
    "curl_close($curl);",
    "",
    "echo $response;",
  ];
  return lines.join("\n");
};

const buildPythonSample = (
  url: string,
  method: "GET" | "POST",
  body?: string,
) => {
  const lines = [
    "import requests",
    "",
    `url = "${url}"`,
    "headers = {",
    '    "Accept": "application/json",',
    ...(method === "POST" ? ['    "Content-Type": "application/json",'] : []),
    "}",
    ...(method === "POST" && body
      ? [`payload = '${escapeSingleQuotes(body)}'`]
      : []),
    "",
    method === "POST"
      ? "response = requests.post(url, headers=headers, data=payload)"
      : "response = requests.get(url, headers=headers)",
    "print(response.json())",
  ];
  return lines.join("\n");
};

const buildGoSample = (url: string, method: "GET" | "POST", body?: string) => {
  const imports = ["fmt", "io", "net/http"];
  const hasBody = method === "POST" && Boolean(body);
  if (hasBody) {
    imports.push("strings");
  }
  const importBlock = imports.map((item) => `\t"${item}"`).join("\n");
  const lines = [
    "package main",
    "",
    "import (",
    importBlock,
    ")",
    "",
    "func main() {",
    "\tclient := &http.Client{}",
    ...(hasBody ? [`\tpayload := strings.NewReader(\`${body}\`)`] : []),
    hasBody
      ? `\treq, err := http.NewRequest("${method}", "${url}", payload)`
      : `\treq, err := http.NewRequest("${method}", "${url}", nil)`,
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    '\treq.Header.Set("Accept", "application/json")',
    ...(method === "POST"
      ? ['\treq.Header.Set("Content-Type", "application/json")']
      : []),
    "",
    "\tres, err := client.Do(req)",
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    "\tdefer res.Body.Close()",
    "",
    "\tbodyBytes, _ := io.ReadAll(res.Body)",
    "\tfmt.Println(string(bodyBytes))",
    "}",
  ];
  return lines.join("\n");
};

type CodeSample = { lang: string; label: string; source: string };

export const buildCodeSamples = (
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: string,
): CodeSample[] => {
  const normalizedBase = normalizeBaseUrl(baseUrl || "");
  const prefix = path.startsWith("/") ? "" : "/";
  const url = `${normalizedBase}${prefix}${path}`;
  const curlSource = buildCurlSample(baseUrl, method, path, body);
  return [
    { lang: "curl", label: "cURL", source: curlSource },
    {
      lang: "javascript",
      label: "JavaScript",
      source: buildJavaScriptSample(url, method, body),
    },
    { lang: "php", label: "PHP", source: buildPhpSample(url, method, body) },
    {
      lang: "python",
      label: "Python",
      source: buildPythonSample(url, method, body),
    },
    { lang: "go", label: "Go", source: buildGoSample(url, method, body) },
  ];
};
