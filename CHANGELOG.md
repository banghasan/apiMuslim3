# Changelog

All notable changes to this project will be documented in this file.

## v3.0.0 — 2025-11-26

Initial public release of API Muslim v3.

- Menyediakan endpoint jadwal sholat lengkap (daftar kota/kabupaten, detail,
  pencarian, jadwal harian & bulanan).
- Menambahkan konversi kalender Masehi ↔ Hijriyah dengan beberapa metode
  perhitungan.
- Menghadirkan perhitungan arah kiblat berbasis koordinat.
- Menyertakan berbagai alat bantu (`/tools/ip`, `/tools/geocode`, `/health`)
  serta statistik penggunaan.
- Mengintegrasikan ensiklopedia hadis (navigasi ID, pagination, cache, dan
  pencarian opsional berbasis Meilisearch).
- Mengaktifkan rate limiting, logging akses, cache hadis, serta middleware
  statistik.
- Menyediakan dokumentasi OpenAPI lengkap dengan ReDoc pada `/doc`.
