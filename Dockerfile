FROM ghcr.io/banghasan/apimuslim3:debian-deno

# Port yang akan di-ekspos oleh aplikasi Anda
EXPOSE 8000

# Healthcheck to ensure the API is running
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "fetch('http://localhost:8000/health').then(r => { if (!r.ok) throw new Error('Health check failed') })"

# Set the working directory
WORKDIR /app

# Menyalin seluruh file proyek ke dalam direktori kerja
COPY . .

# Cache dependencies
RUN deno cache --config deno.json src/main.ts

# Command to run the application
CMD ["deno", "task", "start"]
