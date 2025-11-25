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

const escapeDoubleQuotes = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

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

const buildNodeAxiosSample = (
  url: string,
  method: "GET" | "POST",
  body?: string,
) => {
  const lines = [
    'import axios from "axios";',
    "",
    "const options = {",
    `  method: "${method}",`,
    `  url: "${url}",`,
    "  headers: {",
    '    Accept: "application/json",',
    ...(method === "POST" ? ['    "Content-Type": "application/json",'] : []),
    "  },",
    ...(method === "POST" && body
      ? [`  data: '${escapeSingleQuotes(body)}',`]
      : []),
    "};",
    "",
    "axios.request(options)",
    "  .then((response) => {",
    "    console.log(response.data);",
    "  })",
    "  .catch((error) => {",
    "    console.error(error);",
    "  });",
  ];
  return lines.join("\n");
};

const buildDartSample = (
  url: string,
  method: "GET" | "POST",
  body?: string,
) => {
  const hasBody = method === "POST" && Boolean(body);
  const lines = [
    "import 'dart:convert';",
    "import 'package:http/http.dart' as http;",
    "",
    "Future<void> main() async {",
    `  final uri = Uri.parse('${escapeSingleQuotes(url)}');`,
    "  final headers = {",
    "    'Accept': 'application/json',",
    ...(hasBody ? ["    'Content-Type': 'application/json',"] : []),
    "  };",
    ...(hasBody ? [`  const payload = '${escapeSingleQuotes(body!)}';`] : []),
    hasBody
      ? "  final response = await http.post(uri, headers: headers, body: payload);"
      : "  final response = await http.get(uri, headers: headers);",
    "  if (response.statusCode == 200) {",
    "    final data = jsonDecode(response.body);",
    "    print(data);",
    "  } else {",
    "    print('Request failed: ${response.statusCode}');",
    "  }",
    "}",
  ];
  return lines.join("\n");
};

const buildCSharpSample = (
  url: string,
  method: "GET" | "POST",
  body?: string,
) => {
  const hasBody = method === "POST" && Boolean(body);
  const lines = [
    "using System;",
    "using System.Net.Http;",
    "using System.Net.Http.Headers;",
    ...(hasBody ? ["using System.Text;"] : []),
    "using System.Threading.Tasks;",
    "",
    "class Program",
    "{",
    "    static async Task Main()",
    "    {",
    "        using var client = new HttpClient();",
    `        using var request = new HttpRequestMessage(HttpMethod.${
      method === "POST" ? "Post" : "Get"
    }, "${url}");`,
    '        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));',
    ...(hasBody
      ? [
        `        request.Content = new StringContent("${
          escapeDoubleQuotes(
            body!,
          )
        }", Encoding.UTF8, "application/json");`,
      ]
      : []),
    "        using var response = await client.SendAsync(request);",
    "        response.EnsureSuccessStatusCode();",
    "        var responseBody = await response.Content.ReadAsStringAsync();",
    "        Console.WriteLine(responseBody);",
    "    }",
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
      lang: "node",
      label: "Nodejs",
      source: buildNodeAxiosSample(url, method, body),
    },
    { lang: "php", label: "PHP", source: buildPhpSample(url, method, body) },
    {
      lang: "python",
      label: "Python",
      source: buildPythonSample(url, method, body),
    },
    {
      lang: "dart",
      label: "Dart",
      source: buildDartSample(url, method, body),
    },
    { lang: "go", label: "Go", source: buildGoSample(url, method, body) },
    {
      lang: "csharp",
      label: "C#",
      source: buildCSharpSample(url, method, body),
    },
  ];
};
