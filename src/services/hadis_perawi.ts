import { DB } from "sqlite";

const perawiFields = [
  "name",
  "grade",
  "parents",
  "spouse",
  "siblings",
  "children",
  "birth_date_place",
  "places_of_stay",
  "death_date_place",
  "teachers",
  "students",
  "area_of_interest",
  "tags",
  "books",
  "students_inds",
  "teachers_inds",
  "birth_place",
  "birth_date",
  "birth_date_hijri",
  "birth_date_gregorian",
  "death_date_hijri",
  "death_date_gregorian",
  "death_place",
  "death_reason",
] as const;

export type PerawiField = (typeof perawiFields)[number];

export type PerawiRecord = {
  id: number;
} & { [K in PerawiField]: string | null };

export type PerawiPaging = {
  current: number;
  per_page: number;
  total_data: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
  next_page: number | null;
  prev_page: number | null;
  first_page: number | null;
  last_page: number | null;
};

export type PerawiBrowseResult = {
  paging: PerawiPaging;
  rawi: PerawiRecord[];
};

export type HadisPerawiService = {
  getTotalCount: () => number;
  getById: (id: number) => PerawiRecord | null;
  browse: (page: number, limit: number) => PerawiBrowseResult;
  close: () => void;
};

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const normalizeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return String(value);
};

const selectColumns = ["scholar_indx", ...perawiFields].join(", ");

const mapRow = (row: Record<string, unknown>): PerawiRecord => {
  const id = toNumber(row.scholar_indx) ?? 0;
  const entry: Record<string, string | null> = {};
  for (const field of perawiFields) {
    entry[field] = normalizeString(row[field]) ?? null;
  }
  return { id, ...(entry as Record<PerawiField, string | null>) };
};

export const createHadisPerawiService = (
  dbPath: string,
): HadisPerawiService => {
  const db = new DB(dbPath, { mode: "read" });

  const getTotalCount = () => {
    const row = db.query<[number]>("SELECT COUNT(*) FROM all_rawis");
    return row[0]?.[0] ?? 0;
  };

  const getById = (id: number) => {
    const rows = db.queryEntries<Record<string, unknown>>(
      `SELECT ${selectColumns}
       FROM all_rawis
       WHERE CAST(scholar_indx AS INTEGER) = ?1
       LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  };

  const browse = (page: number, limit: number): PerawiBrowseResult => {
    const perPage = Math.min(Math.max(limit, 1), 20);
    const total = getTotalCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const normalizedPage = totalPages === 0
      ? 0
      : Math.min(Math.max(page, 1), totalPages);
    const offset = normalizedPage <= 1 ? 0 : (normalizedPage - 1) * perPage;

    const rows = db.queryEntries<Record<string, unknown>>(
      `SELECT ${selectColumns}
       FROM all_rawis
       ORDER BY CAST(scholar_indx AS INTEGER)
       LIMIT ?1 OFFSET ?2`,
      [perPage, offset],
    );

    const paging: PerawiPaging = {
      current: normalizedPage,
      per_page: perPage,
      total_data: total,
      total_pages: totalPages,
      has_prev: normalizedPage > 1,
      has_next: totalPages > 0 && normalizedPage < totalPages,
      next_page: totalPages > 0 && normalizedPage < totalPages
        ? normalizedPage + 1
        : null,
      prev_page: normalizedPage > 1 ? normalizedPage - 1 : null,
      first_page: totalPages > 0 ? 1 : null,
      last_page: totalPages > 0 ? totalPages : null,
    };

    return { paging, rawi: rows.map(mapRow) };
  };

  const close = () => {
    db.close();
  };

  return { getTotalCount, getById, browse, close };
};
