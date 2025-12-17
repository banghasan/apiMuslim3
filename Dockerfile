# Use Alpine as the base image
FROM alpine:latest

# Install procps for uptime and other dependencies for Deno
RUN apk --no-cache add procps curl unzip

# Install Deno
ENV DENO_INSTALL=/opt/deno
ENV PATH="$DENO_INSTALL/bin:$PATH"
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

# Create a non-root user 'deno' for security
RUN addgroup -S deno && adduser -S deno -G deno

# Port yang akan di-ekspos oleh aplikasi Anda
EXPOSE 8000

# Healthcheck to ensure the API is running, using absolute path for deno
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /opt/deno/bin/deno eval "fetch('http://localhost:8000/health').then(r => { if (!r.ok) throw new Error('Health check failed') })"

# Set the working directory
WORKDIR /app

# Copy project files with correct ownership
COPY --chown=deno:deno . .

# Switch to the non-root user
USER deno

# Cache dependencies, using absolute path for deno
RUN /opt/deno/bin/deno cache --config deno.json src/main.ts

# Command to run the application, using absolute path for deno
CMD ["/opt/deno/bin/deno", "task", "start"]
