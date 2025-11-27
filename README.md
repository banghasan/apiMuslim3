![myQuran API Logo](https://raw.githubusercontent.com/banghasan/apiMuslim3/main/src/static/api-myquran_text.png)

# API Muslim indonesia

API Komprehensif untuk kebutuhan Muslim di Indonesia, menyediakan data jadwal
sholat, arah kiblat, konversi kalender Hijriah, dan berbagai alat bantu lainnya.
Semua endpoint dirancang untuk kemudahan penggunaan dan integrasi

![API Documentation Preview](https://raw.githubusercontent.com/banghasan/apiMuslim3/main/screenshot/api-doc-screenshot.webp)

## Fitur

- Endpoint daftar lengkap kabupaten/kota (`/sholat/kota|kabkota/(all|semua)`).
- Endpoint detail berdasarkan ID (`/sholat/kota|kabkota/{id}`).
- Endpoint pencarian kata kunci (`/sholat/kota|kabkota/(cari|find)/{keyword}`).
- Endpoint kalender (`/cal/...`) untuk konversi tanggal Masehi ↔ Hijriyah dengan
  opsi metode perhitungan.
- Endpoint arah kiblat (`/qibla/{lat,lng}`) untuk mendapatkan derajat kiblat
  dari koordinat tertentu.
- Endpoint tools utilitas seperti `/tools/ip` untuk mendeteksi IP & user-agent
  pengguna dan `/tools/uptime` untuk memantau lama server berjalan.
- Endpoint health check (`/health`) untuk mengetahui apakah API siap digunakan.
- Rate limiting Per menit per IP
- Response konsisten dengan struktur `status`, `message`, dan `data`.
- Middleware logger akses.
- Dokumentasi OpenAPI otomatis pada `/doc/apimuslim` menggunakan
  `@hono/zod-openapi` + ReDoc viewer di `/doc`.

## Persiapan

1. Pastikan [Deno](https://deno.land/) sudah terpasang (versi 1.42+
   direkomendasikan).
2. Salin atau sesuaikan variabel lingkungan di `.env`:
   ```env
   HOST=0.0.0.0
   PORT=8000
   TIMEZONE=Asia/Jakarta
   LOG_VERBOSE=false
   LOG_WRITE=false
   APP_ENV=development
   DOC_BASE_URL=http://localhost:8000
   MAPSCO_API_KEY=
   ```

## Menjalankan Server

Gunakan salah satu perintah berikut dari root repo:

```bash
# mode pengembangan dengan watch
deno task dev

# mode biasa
deno task start
```

Server akan berjalan di `http://localhost:8000` (atau sesuai konfigurasi pada
`.env`).

## Dokumentasi & Logging

- Setiap akses dapat disimpan ke file harian di `data/log/YYYYMMDD.log`
  (aktifkan `LOG_WRITE=true`).
- Format log: `[timestamp] IP METHOD PATH STATUS DURATIONms`.
- `TIMEZONE` menentukan waktu pada log dan response logger.
- Set `LOG_VERBOSE=true` untuk menampilkan log akses yang sama di console;
  default `false`.
- Set `LOG_WRITE=true` untuk menyalakan penulisan log ke file harian; default
  `false`.
- Logger berjalan non-blok: request tidak lagi menunggu proses penulisan log ke
  disk.
- Dokumen OpenAPI dalam format JSON tersedia di `/doc/sholat`, dan halaman ReDoc
  siap pakai berada di `/doc`.
- `DOC_BASE_URL` menentukan basis URL yang dipakai pada daftar server OpenAPI
  dan contoh `curl` otomatis di ReDoc.

## Panduan Dokumentasi Cepat

1. Jalankan server kemudian buka `DOC_BASE_URL/doc` (contoh:
   `http://localhost:8000/doc`).
2. Gunakan tombol “Cari di Dokumentasi (Ctrl+/)” di bagian atas halaman untuk
   fokus ke kolom pencarian ReDoc.
3. Klik salah satu tautan kategori (Sholat, Kalender, Qibla, Tools) untuk
   melompat ke bagian terkait. Hash yang dipakai ReDoc dapat dirujuk langsung
   seperti contoh berikut.

| Kategori | Penjelasan Singkat                                                              | Tautan (akses setelah server jalan) |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| Sholat   | Daftar lokasi, pencarian, jadwal sholat harian/bulanan.                         | `/doc#/tag/Sholat`                  |
| Kalender | Konversi tanggal Masehi ↔ Hijriyah, opsi metode perhitungan.                    | `/doc#/tag/Kalender`                |
| Qibla    | Hitung arah kiblat berdasarkan koordinat.                                       | `/doc#/tag/Qibla`                   |
| Tools    | Utilitas seperti `/tools/ip`, `/tools/uptime`, `/tools/geocode`, dan `/health`. | `/doc#/tag/Tools`                   |

Contoh: untuk melihat dokumentasi endpoint qibla secara cepat, buka
`http://localhost:8000/doc#/tag/Qibla` setelah server menyala. README ini juga
menyediakan contoh `curl`/JavaScript/PHP/Python/Go di setiap endpoint pada ReDoc
untuk memulai integrasi dengan cepat.

## Cache & Lingkungan

- `APP_ENV` menentukan perilaku cache; nilai default `development` menonaktifkan
  cache untuk mempermudah debugging.
- Atur `APP_ENV=production` untuk mengaktifkan cache in-memory pada pencarian
  sholat dan jadwal bulanan, sehingga respon lebih cepat pada lingkungan
  produksi.
- `MAPSCO_API_KEY` wajib diisi bila ingin memakai `/tools/geocode` (maps.co).

## Pengujian

Jalankan seluruh unit test dengan mengizinkan akses environment & file
(dibutuhkan untuk membaca jadwal JSON):

```bash
deno test --allow-env --allow-read
```

## Endpoint Utama

- `GET /sholat/kota/all`, `/sholat/kota/semua`, `/sholat/kabkota/all`,
  `/sholat/kabkota/semua` – daftar seluruh lokasi.
- `GET /sholat/kota/{id}`, `/sholat/kabkota/{id}` – detail lokasi tertentu.
- `GET /sholat/kota/cari/{keyword}`, `/sholat/kota/find/{keyword}`,
  `/sholat/kabkota/cari/{keyword}`, `/sholat/kabkota/find/{keyword}` – pencarian
  bebas (case-insensitive).
- `GET /sholat/jadwal/{id}/today` – jadwal sholat hari ini per kab/kota dengan
  opsi `tz`/`utc` untuk zona waktu.
- `GET /cal/today` – kalender hari ini (Masehi & Hijriyah); parameter `adj`
  hanya mempengaruhi tanggal Hijriyah, sedangkan CE tetap hari ini.
- `GET /cal/hijr/{YYYY-MM-DD}` – konversi tanggal Masehi (format `YYYY-MM-DD`)
  ke Hijriyah; `adj` hanya mempengaruhi Hijriyah.
- `GET /cal/ce/{YYYY-MM-DD}` – konversi tanggal Hijriyah ke tanggal Masehi;
  `adj` hanya mempengaruhi Masehi.
- `GET /qibla/{lat,lng}` – arah kiblat (derajat dari utara) berdasarkan
  koordinat derajat desimal.
- `GET /tools/ip` – deteksi IP pengguna (memperhatikan proxy/Cloudflare) beserta
  user agent.
- `GET /tools/uptime` – mengetahui uptime VPS (lama server berjalan), waktu
  booting, representasi yang mudah dibaca manusia, dan ringkasan `uptime` native
  Linux.
- `GET /health` – health check sederhana yang mengembalikan waktu server,
  uptime, timezone, dan environment.

## Rate Limiting

- Semua endpoint dibatasi maksimum 100 request/menit per IP untuk mencegah
  penyalahgunaan.
- Endpoint jadwal bulanan `/sholat/jadwal/{id}/{YYYY-MM}` memiliki batas lebih
  ketat yaitu 5 request/menit per IP.
- Response mencantumkan header `RateLimit-Limit`, `RateLimit-Remaining`,
  `RateLimit-Reset`, dan saat limit terlampaui juga `Retry-After` untuk panduan
  klien.
- Pengaturan mudah disesuaikan di `src/config/rate_limit.ts` tanpa perlu
  mengubah kode lain.

Contoh respons sukses:

```json
{
  "status": true,
  "message": "success",
  "data": [
    {
      "id": "eda80a3d5b344bc40f3bc04f65b7a357",
      "lokasi": "KOTA KEDIRI"
    }
  ]
}
```

Jika data tidak ditemukan akan mengembalikan:

```json
{
  "status": false,
  "message": "Data tidak ditemukan."
}
```

## Parameter Kalender

- `adj` (opsional, default `0`): penyesuaian hari; nilai negatif mundur, positif
  maju.
- `method` (opsional, default `standar`): pilih `standar`, `islamic-umalqura`,
  atau `islamic-civil`.
- `utc` atau `tz` (opsional, default `Asia/Jakarta`): menentukan zona waktu
  perhitungan kalender.

Contoh respons `/cal/today`:

```json
{
  "status": true,
  "message": "success",
  "data": {
    "method": "standar",
    "adjustment": 0,
    "ce": {
      "today": "Senin, 24 November 2025",
      "day": 24,
      "dayName": "Senin",
      "month": 11,
      "monthName": "November",
      "year": 2025
    },
    "hijr": {
      "today": "Senin, 2 Jumadilakhir 1447 H",
      "day": 2,
      "dayName": "Senin",
      "month": 6,
      "monthName": "Jumadilakhir",
      "year": 1447
    }
  }
}
```

## Stuktur Data

Sesuaikan struktur data (tidak termasuk dalam repo ini).

```sh
data/
├── log
├── sholat
│   └── jadwal
│       ├── 2025
│       ├── 2026
│       ├── 2027
│       ├── 2028
│       ├── 2029
│       ├── 2030
│       └── ...dst
├── quran
├── hadis
└── etc
```

Data sholat ada pada repository lain, bisa menggunakan docker.

## Dokumentasi

Dokumentasi tersedia:

- Akses `/doc` untuk informasi web base API Muslim v3 ini.
- Akses `GET /doc/apimuslim` untuk mendapatkan spesifikasi OpenAPI (`JSON`) yang
  dapat diimpor ke [Postman](https://www.postman.com) atau
  [Insomnia](https://insomnia.rest/) atau generator klien lainnya.

## Konfigurasi Lingkungan

Beberapa fitur membutuhkan konfigurasi tambahan melalui environment variable:

```sh
# Atur endpoint dan API key Meilisearch agar pencarian hadis (/hadis/enc/cari)
# dapat terhubung
export MEILISEARCH_HOST="https://meili.example.com"
export MEILISEARCH_API_KEY="your_api_key_here"
```

## Kontak

Saran, ide dan pertanyaan dapat melalui kontak:

- Email: banghasan@myquran.com
- Telegram: Grup Telegram [apimuslim](https://t.me/apimuslim)
