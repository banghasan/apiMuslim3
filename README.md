# API Sholat Kab/Kota

REST API sederhana berbasis [Hono](https://hono.dev/) + Deno yang mengekspose daftar kabupaten/kota dari data `data/sholat/kabkota.json`. API ini berguna untuk mengambil ID lokasi jadwal sholat, melakukan pencarian, dan mengecek dokumentasi OpenAPI bawaan.

## Fitur
- Endpoint daftar lengkap kabupaten/kota (`/sholat/kota|kabkota/(all|semua)`).
- Endpoint detail berdasarkan ID (`/sholat/kota|kabkota/{id}`).
- Endpoint pencarian kata kunci (`/sholat/kota|kabkota/(cari|find)/{keyword}`).
- Endpoint kalender (`/cal/...`) untuk konversi tanggal Masehi ↔ Hijriyah dengan opsi metode perhitungan.
- Response konsisten dengan struktur `status`, `message`, dan `data`.
- Middleware logger akses.
- Dokumentasi OpenAPI otomatis pada `/doc/sholat` menggunakan `@hono/zod-openapi` + ReDoc viewer di `/doc`.

## Persiapan
1. Pastikan [Deno](https://deno.land/) sudah terpasang (versi 1.42+ direkomendasikan).
2. Salin atau sesuaikan variabel lingkungan di `.env`:
   ```env
   HOST=0.0.0.0
   PORT=8000
   TIMEZONE=Asia/Jakarta
   LOG_VERBOSE=false
   LOG_WRITE=false
   ```

## Menjalankan Server
Gunakan salah satu perintah berikut dari root repo:
```bash
# mode pengembangan dengan watch
deno task dev

# mode biasa
deno task start
```
Server akan berjalan di `http://localhost:8000` (atau sesuai konfigurasi pada `.env`).

## Dokumentasi & Logging
- Setiap akses dapat disimpan ke file harian di `data/log/YYYYMMDD.log` (aktifkan `LOG_WRITE=true`).
- Format log: `[timestamp] IP METHOD PATH STATUS DURATIONms`.
- `TIMEZONE` menentukan waktu pada log dan response logger.
- Set `LOG_VERBOSE=true` untuk menampilkan log akses yang sama di console; default `false`.
- Set `LOG_WRITE=true` untuk menyalakan penulisan log ke file harian; default `false`.
- Dokumen OpenAPI dalam format JSON tersedia di `/doc/sholat`, dan halaman ReDoc siap pakai berada di `/doc`.

## Endpoint Utama
- `GET /sholat/kota/all`, `/sholat/kota/semua`, `/sholat/kabkota/all`, `/sholat/kabkota/semua` – daftar seluruh lokasi.
- `GET /sholat/kota/{id}`, `/sholat/kabkota/{id}` – detail lokasi tertentu.
- `GET /sholat/kota/cari/{keyword}`, `/sholat/kota/find/{keyword}`, `/sholat/kabkota/cari/{keyword}`, `/sholat/kabkota/find/{keyword}` – pencarian bebas (case-insensitive).
- `GET /cal/today` – kalender hari ini (Masehi & Hijriyah); parameter `adj` hanya mempengaruhi tanggal Hijriyah, sedangkan CE tetap hari ini.
- `GET /cal/hijr/{YYYY-MM-DD}` – konversi tanggal Masehi (format `YYYY-MM-DD`) ke Hijriyah; `adj` hanya mempengaruhi Hijriyah.
- `GET /cal/ce/{YYYY-MM-DD}` – konversi tanggal Hijriyah ke tanggal Masehi; `adj` hanya mempengaruhi Masehi.

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
  "message": "not found or anything .."
}
```

## Parameter Kalender
- `adj` (opsional, default `0`): penyesuaian hari; nilai negatif mundur, positif maju.
- `method` (opsional, default `standar`): pilih `standar`, `islamic-umalqura`, atau `islamic-civil`.
- `utc` atau `tz` (opsional, default `Asia/Jakarta`): menentukan zona waktu perhitungan kalender.

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

## Dokumentasi
Akses `GET /doc/sholat` untuk mendapatkan spesifikasi OpenAPI (JSON) yang dapat diimpor ke Postman/Insomnia atau generator klien lainnya.
