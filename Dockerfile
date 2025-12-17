# Stage 1: Get the Deno binary from the official image
# The user requested version 2.6.1, which is not a standard Deno version.
# Using a recent official version instead.
FROM denoland/deno:2.6.1 as deno_bin

# Stage 2: Build the final image
FROM alpine:latest

# Install procps for uptime command
RUN apk --no-cache add procps

# Copy the Deno binary from the first stage to a directory in the PATH
COPY --from=deno_bin /deno /usr/local/bin/deno

# Create a non-root user 'deno' for security
RUN addgroup -S deno && adduser -S deno -G deno

# Port yang akan di-ekspos oleh aplikasi Anda
EXPOSE 8000

# Healthcheck to ensure the API is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD deno eval "fetch('http://localhost:8000/health').then(r => { if (!r.ok) throw new Error('Health check failed') })"

# Set the working directory
WORKDIR /app

# Copy project files with correct ownership
COPY --chown=deno:deno . .

# Switch to the non-root user
USER deno

# Cache dependencies
RUN deno cache --config deno.json src/main.ts

# Command to run the application
CMD ["deno", "task", "start"]
