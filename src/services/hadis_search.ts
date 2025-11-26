type HadisSearchHit = {
  id: number;
  text: string;
};

export type HadisSearchResult = {
  total: number;
  hits: HadisSearchHit[];
};

export type HadisSearchService = {
  search: (
    keyword: string,
    page: number,
    limit: number,
  ) => Promise<HadisSearchResult>;
};

type CreateHadisSearchServiceOptions = {
  host: string;
  apiKey: string;
  index?: string;
};

type MeiliSearchResponse = {
  hits: Array<{ id?: number; hadith_text?: string }>;
  estimatedTotalHits?: number;
  totalHits?: number;
};

const buildHeaders = (apiKey: string) => {
  const headers: HeadersInit = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-Meili-API-Key"] = apiKey;
  }
  return headers;
};

export const createHadisSearchService = ({
  host,
  apiKey,
  index = "hadis",
}: CreateHadisSearchServiceOptions): HadisSearchService => {
  const endpoint = new URL(
    `/indexes/${index}/search`,
    host.endsWith("/") ? host : `${host}/`,
  ).toString();
  const headers = buildHeaders(apiKey);

  const search = async (
    keyword: string,
    page: number,
    limit: number,
  ): Promise<HadisSearchResult> => {
    const offset = page <= 1 ? 0 : (page - 1) * limit;
    const body = {
      q: keyword,
      limit,
      offset,
      attributesToRetrieve: ["id", "hadith_text"],
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Hadis search failed with status ${response.status}`);
    }
    const payload = (await response.json()) as MeiliSearchResponse;
    const total = payload.estimatedTotalHits ?? payload.totalHits ?? 0;
    const hits = (payload.hits ?? []).map((item) => ({
      id: typeof item.id === "number" ? item.id : Number(item.id ?? 0),
      text: item.hadith_text ?? "",
    }));
    return { total, hits };
  };

  return { search };
};
