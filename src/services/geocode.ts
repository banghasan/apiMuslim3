const MAX_QUEUE = 60;
const RATE_DELAY_MS = 1000;

type GeocodeJob = {
  query: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export type GeocodeService = ReturnType<typeof createGeocodeService>;

export const createGeocodeService = (apiKey: string) => {
  const queue: GeocodeJob[] = [];
  let active = false;

  const fetchGeocode = async (query: string) => {
    const url = new URL("https://geocode.maps.co/search");
    url.searchParams.set("q", query);
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }
    const response = await fetch(url, {
      headers: { "accept": "application/json" },
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
        setTimeout(() => {
          active = false;
          scheduleNext();
        }, RATE_DELAY_MS);
      });
  };

  const enqueue = (query: string): Promise<unknown> => {
    if (!apiKey) {
      return Promise.reject(new Error("MAPSCO_API_KEY missing"));
    }
    if (queue.length >= MAX_QUEUE) {
      return Promise.reject(new Error("QUEUE_OVERFLOW"));
    }
    return new Promise((resolve, reject) => {
      queue.push({ query, resolve, reject });
      scheduleNext();
    });
  };

  return { enqueue };
};
