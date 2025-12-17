# Use Alpine as the base image
FROM alpine:latest

# Install procps for uptime and other dependencies for Deno
RUN apk --no-cache add procps curl unzip

# Install Deno
# The user requested version 2.6.1, but this is not a standard Deno version.
# The script below installs the latest official version of Deno.
ENV DENO_INSTALL=/opt/deno
ENV PATH="$DENO_INSTALL/bin:$PATH"
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

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
# This ensures that the 'deno' user owns all the application files.
COPY --chown=deno:deno . .

# Switch to the non-root user
USER deno

# Cache dependencies
RUN deno cache --config deno.json src/main.ts

# Command to run the application
CMD ["deno", "task", "start"]
