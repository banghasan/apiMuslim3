# Panduan Versi Aplikasi

## Deskripsi

File ini berisi catatan dan petunjuk mengenai sistem versi aplikasi API Muslim
untuk proyek `ApiMuslim3`. Panduan ini menjelaskan bagaimana cara menaikkan
versi aplikasi sesuai dengan prinsip Semantic Versioning (SemVer).

## Struktur Versi

Format versi mengikuti aturan SemVer: `MAJOR.MINOR.PATCH`

- `MAJOR` - Peningkatan besar yang tidak kompatibel secara mundur (breaking
  changes)
- `MINOR` - Penambahan fitur baru yang masih kompatibel secara mundur
- `PATCH` - Perbaikan bug dan perubahan kecil yang kompatibel secara mundur

## Lokasi File Konfigurasi Versi

Versi utama aplikasi didefinisikan di:

- `src/config.ts` - Variabel `APP_VERSION` (contoh: `"v3.0.0"`)

## Cara Menaikkan Versi

### Metode Otomatis (Disarankan)

Gunakan skrip versi bawaan untuk menaikkan versi:

```bash
# Naikkan PATCH (misal: v3.0.0 → v3.0.1)
deno task version-patch

# Naikkan MINOR (misal: v3.0.1 → v3.1.0)
deno task version-minor

# Naikkan MAJOR (misal: v3.1.0 → v4.0.0)
deno task version-major
```

### Jalankan Secara Langsung

```bash
# Naikkan PATCH
deno run --allow-read --allow-write scripts/version_bump.ts patch

# Naikkan MINOR
deno run --allow-read --allow-write scripts/version_bump.ts minor

# Naikkan MAJOR
deno run --allow-read --allow-write scripts/version_bump.ts major
```

## Fungsi Skrip Version Bump

- Memperbarui variabel `APP_VERSION` di `src/config.ts`
- Membuat entri baru di `CHANGELOG.md` dengan tanggal saat ini
- Format versi mengikuti format `vX.Y.Z` (contoh: `v3.0.1`)

## Catatan Penting

- Pastikan untuk melakukan commit sebelum menaikkan versi
- Setelah menaikkan versi, sebaiknya buat git tag untuk milestone versi tersebut
- Versi juga digunakan dalam dokumentasi API dan statistik aplikasi
- Pastikan deskripsi perubahan di CHANGELOG.md diupdate secara manual jika
  diperlukan

## Contoh Penggunaan

Jika saat ini versi aplikasi adalah `v3.0.0`:

- Setelah `deno task version-patch` → `v3.0.1` (perbaikan bug)
- Setelah `deno task version-minor` → `v3.1.0` (fitur baru kompatibel)
- Setelah `deno task version-major` → `v4.0.0` (perubahan besar)

## Informasi Tambahan

- Skrip menggunakan format ISO tanggal (YYYY-MM-DD) untuk entri changelog
- Selalu backup proyek Anda sebelum melakukan perubahan versi besar
- Pastikan untuk menguji aplikasi setelah perubahan versi
