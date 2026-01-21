# API Muslim Indonesia - QWEN Context

## Project Overview

API Muslim Indonesia is a comprehensive REST API service designed for Muslim needs in Indonesia. It provides prayer schedules, qibla direction calculation, Hijri calendar conversion, Quran data, Hadith collections, and various utility tools. Built with Deno and the Hono framework, it offers OpenAPI documentation and follows modern API design principles.

### Key Features
- Prayer schedule data for Indonesian cities and districts
- Qibla direction calculation based on coordinates
- Hijri calendar conversion (Gregorian ↔ Islamic)
- Holiday information for Indonesia
- Quran endpoints with translations and audio
- Hadith collections with search capabilities
- Utility tools (IP detection, uptime monitoring)
- Rate limiting and access logging
- OpenAPI documentation with ReDoc interface

### Technologies Used
- **Runtime**: Deno (v1.42+ recommended)
- **Framework**: Hono (with OpenAPI integration)
- **Database**: SQLite for local data storage
- **Search**: Meilisearch integration for advanced search capabilities
- **Documentation**: OpenAPI specification with ReDoc
- **Containerization**: Docker support

## Building and Running

### Prerequisites
- Install [Deno](https://deno.land/) version 1.42 or higher
- Copy `.env.example` to `.env` and configure environment variables

### Development
```bash
# Run in development mode with hot reload
deno task dev

# Run in production mode
deno task start
```

### Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d
```

### Testing
```bash
# Run all unit tests
deno test --allow-env --allow-read
```

## Configuration

### Environment Variables
- `HOST`: Server hostname (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `TIMEZONE`: Timezone for logs and responses (default: Asia/Jakarta)
- `APP_ENV`: Environment (development/production) - affects caching
- `DOC_BASE_URL`: Base URL for API documentation
- `MAPSCO_API_KEY`: API key for geocoding services
- `MEILISEARCH_HOST`: Host for Meilisearch integration
- `MEILISEARCH_API_KEY`: API key for Meilisearch

### Logging Configuration
- `LOG_VERBOSE`: Enable verbose console logging (default: false)
- `LOG_WRITE`: Enable file logging (default: false)
- `LOG_RETENTION_DAYS`: Log retention period in days (default: 30)

## Architecture

### Main Components
- **Main Application**: `src/main.ts` - Entry point using OpenAPI Hono
- **Configuration**: `src/config.ts` - Environment and app configuration
- **Routes**: `src/routes/` - API route definitions
- **Services**: `src/services/` - Business logic implementations
- **Middleware**: `src/middleware/` - Request processing layers
- **Static Assets**: `src/static/` - Documentation and UI resources

### Route Categories
- `/quran` - Quran data endpoints
- `/sholat` - Prayer schedule endpoints
- `/cal` - Calendar conversion endpoints
- `/qibla` - Qibla direction calculation
- `/hadis` - Hadith collection endpoints
- `/tools` - Utility endpoints
- `/health` - Health check endpoint
- `/doc` - API documentation

### Rate Limiting
The API implements rate limiting with configurable rules:
- Default: 120 requests per minute per IP
- Monthly prayer schedules: 15 requests per minute per IP
- Hadith search: 1 request per second per IP

## Development Conventions

### Coding Standards
- Follow Deno's official style guide
- Use TypeScript for type safety
- Leverage Hono's middleware pattern
- Implement consistent response structure: `{status, message, data}`

### Response Format
Successful responses follow this structure:
```json
{
  "status": true,
  "message": "success",
  "data": {...}
}
```

Error responses:
```json
{
  "status": false,
  "message": "Error message"
}
```

### Testing
- Write unit tests for all service functions
- Use Deno's built-in test runner
- Ensure tests have necessary permissions (--allow-env, --allow-read)

### Version Management
The project follows Semantic Versioning (SemVer):
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

Use the following commands to bump versions:
```bash
deno task version-patch  # Increment patch version
deno task version-minor  # Increment minor version
deno task version-major  # Increment major version
```

## Data Structure
The application expects the following data directory structure:
```
data/
├── log/              # Access logs
├── sholat/jadwal/    # Prayer schedule data by year
├── quran/            # Quran database
├── hadis/            # Hadith collections
└── stats.db          # Statistics database
```

## Documentation
- Interactive API documentation available at `/doc`
- OpenAPI specification at `/doc/apimuslim`
- Detailed endpoint examples with curl/JavaScript/PHP/Python/Go code snippets