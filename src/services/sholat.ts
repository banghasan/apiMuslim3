export type RawEntry = {
  value: string;
  text: string;
};

export type KabKotaSource = {
  fetchedAt?: string;
  map?: Record<string, RawEntry[]>;
};

export type Location = {
  id: string;
  lokasi: string;
};

export type SholatData = {
  locations: Location[];
  idIndex: Map<string, Location>;
};

export const loadSholatData = async (): Promise<SholatData> => {
  const kabKotaFile = new URL(
    "../../data/sholat/kabkota.json",
    import.meta.url,
  );
  const parsedSource = JSON.parse(
    await Deno.readTextFile(kabKotaFile),
  ) as KabKotaSource;

  const locationMap = new Map<string, Location>();
  for (const group of Object.values(parsedSource.map ?? {})) {
    for (const entry of group ?? []) {
      if (!entry?.value || !entry?.text) continue;
      if (!locationMap.has(entry.value)) {
        locationMap.set(entry.value, {
          id: entry.value,
          lokasi: entry.text.trim(),
        });
      }
    }
  }

  const locations = Array.from(locationMap.values());
  const idIndex = new Map(locations.map((loc) => [loc.id, loc] as const));
  return { locations, idIndex };
};

export type SholatService = ReturnType<typeof createSholatService>;

type SearchCacheValue = { data: Location[]; storedAt: number };

export type SholatServiceOptions = {
  enableCache: boolean;
  data: SholatData;
  searchCacheTtlMs?: number;
};

export const createSholatService = ({
  enableCache,
  data,
  searchCacheTtlMs = 10 * 60 * 1000,
}: SholatServiceOptions) => {
  const searchCache = enableCache ? new Map<string, SearchCacheValue>() : null;

  const getAllLocations = () => data.locations;
  const findById = (id: string) => data.idIndex.get(id);

  const getCachedSearch = (needle: string): Location[] | null => {
    if (!searchCache) return null;
    const cached = searchCache.get(needle);
    if (!cached) return null;
    if (Date.now() - cached.storedAt > searchCacheTtlMs) {
      searchCache.delete(needle);
      return null;
    }
    return cached.data;
  };

  const setSearchCache = (needle: string, result: Location[]) => {
    if (!searchCache) return;
    searchCache.set(needle, { data: result, storedAt: Date.now() });
  };

  const searchLocations = (needle: string): Location[] => {
    const cached = getCachedSearch(needle);
    if (cached) return cached;
    const list = data.locations.filter((loc) =>
      loc.lokasi.toLowerCase().includes(needle)
    );
    if (list.length > 0) {
      setSearchCache(needle, list);
    }
    return list;
  };

  return {
    locations: data.locations,
    idIndex: data.idIndex,
    getAllLocations,
    findById,
    searchLocations,
  };
};
