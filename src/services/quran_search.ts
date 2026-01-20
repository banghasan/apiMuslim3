import type { AyahWithSurah } from "./quran.ts";

export type QuranSearchHit = AyahWithSurah;

export type QuranSearchResult = {
  total: number;
  hits: QuranSearchHit[];
};

export type QuranSearchService = {
  search: (
    keyword: string,
    page: number,
    limit: number,
  ) => Promise<QuranSearchResult>;
};

type CreateQuranSearchServiceOptions = {
  host: string;
  apiKey: string;
  index?: string;
};

type MeilisearchHit = Partial<QuranSearchHit>;

type MeiliSearchResponse = {
  hits: Array<MeilisearchHit>;
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

export const createQuranSearchService = ({
  host,
  apiKey,
  index = "quran",
}: CreateQuranSearchServiceOptions): QuranSearchService => {
  const endpoint = new URL(
    `/indexes/${index}/search`,
    host.endsWith("/") ? host : `${host}/`,
  ).toString();
  const headers = buildHeaders(apiKey);

  const search = async (
    keyword: string,
    page: number,
    limit: number,
  ): Promise<QuranSearchResult> => {
    const offset = page <= 1 ? 0 : (page - 1) * limit;
    const body = {
      q: keyword,
      limit,
      offset,
      // We retrieve all attributes because we want to return the full Ayah structure
      // attributesToRetrieve: ["*"],
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Quran search failed with status ${response.status}`);
    }
    const payload = (await response.json()) as MeiliSearchResponse;
    const total = payload.estimatedTotalHits ?? payload.totalHits ?? 0;

    // cast hits to QuranSearchHit (which is AyahWithSurah)
    // assuming Meilisearch index stores nearly identical structure to AyahWithSurah
    // deno-lint-ignore no-explicit-any
    const hits = (payload.hits ?? []).map((item: any) =>
      item as QuranSearchHit
    );

    return { total, hits };
  };

  return { search };
};
