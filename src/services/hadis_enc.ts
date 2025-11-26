import { DB } from "sqlite";

export type HadisEncDetail = {
  id: number;
  text: { ar: string; id: string };
  grade: string | null;
  takhrij: string | null;
  hikmah: string | null;
  prev: number | null;
  next: number | null;
};

export type HadisEncListEntry = Omit<HadisEncDetail, "prev" | "next">;

export type HadisEncPaging = {
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

export type HadisEncExploreResult = {
  paging: HadisEncPaging;
  hadis: HadisEncListEntry[];
};

export type HadisEncService = {
  getById: (id: number) => HadisEncDetail | null;
  getNext: (id: number) => HadisEncDetail | null;
  getPrevious: (id: number) => HadisEncDetail | null;
  getRandom: () => HadisEncDetail | null;
  explore: (page: number, limit: number) => HadisEncExploreResult;
  close: () => void;
};

type DetailRow = {
  id: string | number;
  id_num: number | null;
  grade: string | null;
  takhrij: string | null;
  text_ar: string | null;
  text_id: string | null;
  hikmah: string | null;
  id_before: string | number | null;
  id_after: string | number | null;
};

type ListRow = {
  id: string | number;
  grade: string | null;
  takhrij: string | null;
  text_ar: string | null;
  text_id: string | null;
  hikmah: string | null;
};

const DETAIL_VIEW = `
  SELECT
    id,
    CAST(id AS INTEGER) AS id_num,
    grade,
    takhrij,
    hadith_text_ar AS text_ar,
    hadith_text AS text_id,
    benefits AS hikmah,
    LAG(id, 1, NULL) OVER (ORDER BY CAST(id AS INTEGER)) AS id_before,
    LEAD(id, 1, NULL) OVER (ORDER BY CAST(id AS INTEGER)) AS id_after
  FROM enc
`;

const sanitizeBracketValue = (value: string | null): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/[\[\]]/g, "").trim();
  return cleaned.length ? cleaned : null;
};

const toNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapDetailRow = (row: DetailRow): HadisEncDetail => {
  const id = toNumber(row.id) ?? toNumber(row.id_num) ?? 0;
  const prev = toNumber(row.id_before);
  const next = toNumber(row.id_after);
  const hikmah = row.hikmah?.trim() ?? null;
  return {
    id,
    text: {
      ar: row.text_ar ?? "",
      id: row.text_id ?? "",
    },
    grade: sanitizeBracketValue(row.grade),
    takhrij: sanitizeBracketValue(row.takhrij),
    hikmah: hikmah && hikmah.length ? hikmah : null,
    prev,
    next,
  };
};

const mapListRow = (row: ListRow): HadisEncListEntry => {
  const hikmah = row.hikmah?.trim() ?? null;
  return {
    id: toNumber(row.id) ?? 0,
    text: {
      ar: row.text_ar ?? "",
      id: row.text_id ?? "",
    },
    grade: sanitizeBracketValue(row.grade),
    takhrij: sanitizeBracketValue(row.takhrij),
    hikmah: hikmah && hikmah.length ? hikmah : null,
  };
};

export const createHadisEncService = (dbPath: string): HadisEncService => {
  const db = new DB(dbPath, { mode: "read" });

  const selectDetail = (clause: string, params: (string | number)[] = []) => {
    const rows = db.queryEntries<DetailRow>(
      `SELECT * FROM (${DETAIL_VIEW}) ${clause}`,
      params,
    );
    const row = rows[0];
    return row ? mapDetailRow(row) : null;
  };

  const getById = (id: number) =>
    selectDetail("WHERE id_num = ?1 LIMIT 1", [id]);

  const getNext = (id: number) =>
    selectDetail(
      "WHERE id_num > ?1 ORDER BY id_num ASC LIMIT 1",
      [id],
    );

  const getPrevious = (id: number) =>
    selectDetail(
      "WHERE id_num < ?1 ORDER BY id_num DESC LIMIT 1",
      [id],
    );

  const getRandom = () => selectDetail("ORDER BY RANDOM() LIMIT 1");

  const explore = (page: number, limit: number): HadisEncExploreResult => {
    const perPage = Math.min(Math.max(limit, 1), 10);
    const requestedPage = page >= 1 ? page : 1;
    const totalData = db.query<[number]>("SELECT COUNT(*) FROM enc")[0][0] ?? 0;
    const totalPages = totalData === 0
      ? 0
      : Math.ceil(totalData / perPage);
    const maxPage = totalPages === 0 ? 1 : totalPages;
    const current = totalPages === 0
      ? 0
      : Math.min(requestedPage, maxPage);
    const offset = current <= 1 ? 0 : (current - 1) * perPage;
    const rows = db.queryEntries<ListRow>(
      `SELECT
        id,
        grade,
        takhrij,
        hadith_text_ar AS text_ar,
        hadith_text AS text_id,
        benefits AS hikmah
      FROM enc
      ORDER BY CAST(id AS INTEGER)
      LIMIT ?1 OFFSET ?2`,
      [perPage, offset],
    );
    const paging: HadisEncPaging = {
      current,
      per_page: perPage,
      total_data: totalData,
      total_pages: totalPages,
      has_prev: current > 1,
      has_next: totalPages > 0 && current < totalPages,
      next_page: totalPages > 0 && current < totalPages ? current + 1 : null,
      prev_page: current > 1 ? current - 1 : null,
      first_page: totalPages > 0 ? 1 : null,
      last_page: totalPages > 0 ? totalPages : null,
    };
    return { paging, hadis: rows.map(mapListRow) };
  };

  const close = () => {
    db.close();
  };

  return { getById, getNext, getPrevious, getRandom, explore, close };
};
