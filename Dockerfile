# Menggunakan image Deno resmi sebagai base
FROM denoland/deno:2.6.1

# Port yang akan di-ekspos oleh aplikasi Anda
EXPOSE 8000

# Menentukan direktori kerja di dalam container
WORKDIR /app

# Menyalin seluruh file proyek ke dalam direktori kerja
COPY . .

# Melakukan cache pada dependensi yang dibutuhkan oleh aplikasi
# Ini akan mempercepat start-up pada build berikutnya
RUN deno cache --config deno.json src/main.ts

# Perintah untuk menjalankan aplikasi saat container dimulai
# Menggunakan task 'start' dari deno.json
CMD ["deno", "task", "start"]
