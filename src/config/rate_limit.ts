export type RateLimitRule = {
  id: string;
  windowMs: number;
  limit: number;
  label: string;
};

export type RateLimitOverride = RateLimitRule & {
  methods?: string[];
  pathPattern: RegExp;
};

export type RateLimitConfig = {
  default: RateLimitRule;
  overrides: RateLimitOverride[];
};

const ONE_MINUTE = 60_000;

export const rateLimitConfig: RateLimitConfig = {
  default: {
    id: "global",
    windowMs: ONE_MINUTE,
    limit: 120,
    label: "API",
  },
  overrides: [
    {
      id: "sholat-monthly",
      windowMs: ONE_MINUTE,
      limit: 15,
      label: "jadwal sholat bulanan",
      methods: ["GET"],
      pathPattern: /^\/sholat\/jadwal\/[^/]+\/\d{4}-\d{2}$/i,
    },
    {
      id: "hadis-enc-explore",
      windowMs: ONE_MINUTE,
      limit: 10,
      label: "eksplorasi hadis",
      methods: ["GET"],
      pathPattern: /^\/hadis\/enc\/explore$/i,
    },
    {
      id: "hadis-enc-search",
      windowMs: 1000,
      limit: 1,
      label: "pencarian hadis",
      methods: ["GET"],
      pathPattern: /^\/hadis\/enc\/(cari|search)\/[^/]+$/i,
    },
  ],
};
