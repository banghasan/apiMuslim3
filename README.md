# API Sholat Kab/Kota

REST API sederhana berbasis [Hono](https://hono.dev/) + Deno yang mengekspose daftar kabupaten/kota dari data `data/sholat/kabkota.json`. API ini berguna untuk mengambil ID lokasi jadwal sholat, melakukan pencarian, dan mengecek dokumentasi OpenAPI bawaan.

## Fitur
- Endpoint daftar lengkap kabupaten/kota (`/sholat/kota|kabkota/(all|semua)`).
- Endpoint detail berdasarkan ID (`/sholat/kota|kabkota/{id}`).
- Endpoint pencarian kata kunci (`/sholat/kota|kabkota/(cari|find)/{keyword}`).
- Response konsisten dengan struktur `status`, `message`, dan `data`.
- Middleware logger akses.
- Dokumentasi OpenAPI otomatis pada `/doc/sholat` menggunakan `@hono/zod-openapi`.

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

## Logging
- Setiap akses dapat disimpan ke file harian di `data/log/YYYYMMDD.log` (aktifkan `LOG_WRITE=true`).
- Format log: `[timestamp] IP METHOD PATH STATUS DURATIONms`.
- `TIMEZONE` menentukan waktu pada log dan response logger.
- Set `LOG_VERBOSE=true` untuk menampilkan log akses yang sama di console; default `false`.
- Set `LOG_WRITE=true` untuk menyalakan penulisan log ke file harian; default `false`.

## Endpoint Utama
- `GET /sholat/kota/all`, `/sholat/kota/semua`, `/sholat/kabkota/all`, `/sholat/kabkota/semua` – daftar seluruh lokasi.
- `GET /sholat/kota/{id}`, `/sholat/kabkota/{id}` – detail lokasi tertentu.
- `GET /sholat/kota/cari/{keyword}`, `/sholat/kota/find/{keyword}`, `/sholat/kabkota/cari/{keyword}`, `/sholat/kabkota/find/{keyword}` – pencarian bebas (case-insensitive).

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

## Dokumentasi
Akses `GET /doc/sholat` untuk mendapatkan spesifikasi OpenAPI (JSON) yang dapat diimpor ke Postman/Insomnia atau generator klien lainnya.
