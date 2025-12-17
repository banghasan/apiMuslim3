# Menggunakan image Deno resmi sebagai base
FROM denoland/deno:2.6.1

# Port yang akan di-ekspos oleh aplikasi Anda
EXPOSE 8000

# Healthcheck untuk memastikan API berjalan menggunakan Deno
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "fetch('http://localhost:8000/health').then(r => { if (!r.ok) throw new Error('Health check failed') })"

# Menentukan direktori kerja di dalam container
WORKDIR /app

# Install procps for uptime command
USER root
RUN apt-get update && \
    apt-get install -y procps && \
    rm -rf /var/lib/apt/lists/*
USER deno

# Menyalin seluruh file proyek ke dalam direktori kerja
COPY . .

# Melakukan cache pada dependensi yang dibutuhkan oleh aplikasi
# Ini akan mempercepat start-up pada build berikutnya
RUN deno cache --config deno.json src/main.ts

# Perintah untuk menjalankan aplikasi saat container dimulai
# Menggunakan task 'start' dari deno.json
CMD ["deno", "task", "start"]
