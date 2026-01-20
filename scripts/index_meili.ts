import { DB } from "sqlite";
import { MeiliSearch } from "meilisearch";
import "@std/dotenv/load";

const DB_PATH = "data/quran/quran.db";
const MEILISEARCH_HOST = Deno.env.get("MEILISEARCH_HOST") ||
  "http://localhost:7700";
const MEILISEARCH_API_KEY = Deno.env.get("MEILISEARCH_API_KEY") || "";

if (!MEILISEARCH_API_KEY) {
  console.error("Error: MEILISEARCH_API_KEY is not set.");
  Deno.exit(1);
}

const client = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
});

const indexName = "quran";

type QuranRow = [
  number, // id
  number, // surah_number
  number, // ayah_number
  string, // arab
  string, // translation
  string | null, // tafsir_kemenag_short
  string | null, // tafsir_kemenag_long
  string | null, // tafsir_quraish
  string | null, // tafsir_jalalayn
  string | null, // audio_url
  string | null, // image_url
  number | null, // meta_juz
  number | null, // meta_page
  number | null, // meta_manzil
  number | null, // meta_ruku
  number | null, // meta_hizb_quarter
  number | null, // meta_sajda_recommended
  number | null, // meta_sajda_obligatory
  string, // surah_name
  string, // surah_name_latin
  string, // surah_translation
  string, // surah_revelation
];

async function main() {
  console.log("Opening database...");
  const db = new DB(DB_PATH);

  console.log("Fetching data from SQLite...");
  // Join surahs and ayahs to get a flat structure suitable for search
  const query = `
    SELECT 
      a.id, a.surah_number, a.ayah_number, a.arab, a.translation,
      a.tafsir_kemenag_short, a.tafsir_kemenag_long, a.tafsir_quraish, a.tafsir_jalalayn,
      a.audio_url, a.image_url, a.meta_juz, a.meta_page, a.meta_manzil, a.meta_ruku, a.meta_hizb_quarter,
      a.meta_sajda_recommended, a.meta_sajda_obligatory,
      s.name as surah_name, s.name_latin as surah_name_latin, s.translation as surah_translation,
      s.revelation as surah_revelation
    FROM ayahs a
    JOIN surahs s ON a.surah_number = s.number
    ORDER BY a.surah_number, a.ayah_number ASC
  `;

  const rows = db.query<QuranRow>(query);
  db.close();

  // proper mapping because sqlite returns array of values
  const documents = rows.map((r) => ({
    id: r[0], // Unique ID for Meilisearch (using the ayah PKEY id)
    surah_number: r[1],
    ayah_number: r[2],
    arab: r[3],
    translation: r[4],
    tafsir_kemenag_short: r[5],
    tafsir_kemenag_long: r[6],
    tafsir_quraish: r[7],
    tafsir_jalalayn: r[8],
    audio_url: r[9],
    image_url: r[10],
    meta_juz: r[11],
    meta_page: r[12],
    meta_manzil: r[13],
    meta_ruku: r[14],
    meta_hizb_quarter: r[15],
    meta_sajda_recommended: Boolean(r[16]),
    meta_sajda_obligatory: Boolean(r[17]),
    surah: {
      name: r[18],
      name_latin: r[19],
      translation: r[20],
      revelation: r[21],
    },
  }));

  console.log(`Fetched ${documents.length} ayahs.`);

  console.log(`Connecting to Meilisearch at ${MEILISEARCH_HOST}...`);

  const index = client.index(indexName);

  console.log("Updating index settings...");

  await index.updateFilterableAttributes([
    "surah_number",
    "ayah_number",
    "meta_juz",
    "meta_page",
    "meta_manzil",
    "meta_ruku",
    "meta_hizb_quarter",
    "meta_sajda_recommended",
    "meta_sajda_obligatory",
  ]);

  await index.updateSearchableAttributes([
    "translation",
    "tafsir_kemenag_short",
    "tafsir_kemenag_long",
    "tafsir_quraish",
    "tafsir_jalalayn",
    "surah.name_latin",
    "surah.translation",
    "arab",
  ]);

  await index.updateSortableAttributes([
    "surah_number",
    "ayah_number",
  ]);

  console.log("Adding documents...");
  // Meilisearch v0.30+ addDocuments returns a Task object, not EnqueuedTask in all versions?
  // Let's assume standard behavior.
  const task = await index.addDocuments(documents, { primaryKey: "id" });

  console.log(`Task enqueued: ${task.taskUid}`);
  console.log("Waiting for task to complete...");

  // Use client.waitForTask for v0.30+, or index.waitForTask for older/some wrappers.
  // Actually, checking docs: v0.40+ `client.waitForTask(uid)`
  const result = await client.waitForTask(task.taskUid);

  if (result.status === "succeeded") {
    console.log("Import completed successfully!");
    console.log(`Indexed ${documents.length} documents.`);
  } else {
    console.error("Import failed with status:", result.status);
    console.error(result.error);
  }
}

main().catch((err) => {
  console.error(err);
  Deno.exit(1);
});
