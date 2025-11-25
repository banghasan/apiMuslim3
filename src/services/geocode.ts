const MAX_QUEUE = 10;
const RATE_DELAY_MS = 1000;

type GeocodeJob = {
  query: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export type GeocodeService = ReturnType<typeof createGeocodeService>;

type GeocodeOptions = {
  fetchImpl?: typeof fetch;
  maxQueue?: number;
  rateDelayMs?: number;
  scheduleFn?: (cb: () => void, delay: number) => unknown;
  immediateFlush?: boolean;
};

export const createGeocodeService = (
  apiKey: string,
  options: GeocodeOptions = {},
) => {
  const queue: GeocodeJob[] = [];
  let active = false;
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxQueue = options.maxQueue ?? MAX_QUEUE;
  const rateDelay = options.rateDelayMs ?? RATE_DELAY_MS;
  const schedule = options.scheduleFn ??
    ((cb: () => void, delay: number) => setTimeout(cb, delay));
  const immediateFlush = options.immediateFlush ?? false;

  const fetchGeocode = async (query: string) => {
    const url = new URL("https://geocode.maps.co/search");
    url.searchParams.set("q", query);
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }
    const response = await fetchImpl(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Geocode request failed (${response.status})`);
    }
    return await response.json();
  };

  const scheduleNext = () => {
    if (active) return;
    const job = queue.shift();
    if (!job) return;
    active = true;
    fetchGeocode(job.query)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        const release = () => {
          active = false;
          scheduleNext();
        };
        if (immediateFlush) {
          release();
        } else {
          schedule(release, rateDelay);
        }
      });
  };

  const enqueue = (query: string): Promise<unknown> => {
    if (!apiKey) {
      return Promise.reject(new Error("MAPSCO_API_KEY missing"));
    }
    if (queue.length >= maxQueue) {
      return Promise.reject(new Error("QUEUE_OVERFLOW"));
    }
    return new Promise((resolve, reject) => {
      queue.push({ query, resolve, reject });
      scheduleNext();
    });
  };

  return { enqueue };
};
