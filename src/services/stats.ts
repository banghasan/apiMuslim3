import { DB } from "sqlite";

export type YearlyHitStat = {
  tahun: number;
  hits: number;
};

export type MonthlyHitStat = {
  tahun: number;
  bulan: number;
  hits: number;
};

export type StatsService = {
  incrementHit: (stamp?: Date) => void;
  getYearlyStats: () => YearlyHitStat[];
  getYearDetail: (
    year: number,
  ) => { avg: number; detail: MonthlyHitStat[] };
  close: () => void;
};

export const createStatsService = (dbPath: string): StatsService => {
  const db = new DB(dbPath);
  db.execute(`
    CREATE TABLE IF NOT EXISTS stats (
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year, month)
    )
  `);

  const incrementHit = (stamp = new Date()) => {
    const year = stamp.getFullYear();
    const month = stamp.getMonth() + 1;
    try {
      db.query(
        `INSERT INTO stats (year, month, hits)
         VALUES (?1, ?2, 1)
         ON CONFLICT(year, month) DO UPDATE SET hits = hits + 1`,
        [year, month],
      );
    } catch (error) {
      console.error("Failed to store hit statistic", error);
    }
  };

  const getYearlyStats = (): YearlyHitStat[] => {
    const rows = db.query<[number, number]>(
      `SELECT year, SUM(hits) as hits
       FROM stats
       GROUP BY year
       ORDER BY year DESC`,
    );
    return rows.map(([tahun, hits]) => ({ tahun, hits }));
  };

  const getYearDetail = (year: number) => {
    const detailRows = db.query<[number, number, number]>(
      `SELECT year, month, hits
       FROM stats
       WHERE year = ?1
       ORDER BY month ASC`,
      [year],
    );
    const detail = detailRows.map(([tahun, bulan, hits]) => ({
      tahun,
      bulan,
      hits,
    }));
    const total = detail.reduce((sum, entry) => sum + entry.hits, 0);
    const avg = detail.length ? Number((total / detail.length).toFixed(2)) : 0;
    return { avg, detail };
  };

  const close = () => {
    db.close();
  };

  return { incrementHit, getYearlyStats, getYearDetail, close };
};
