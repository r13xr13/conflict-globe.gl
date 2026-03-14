# Conflict Globe Server

API server for the Conflict Globe OSINT platform. Provides real-time conflict, maritime, air, cyber, and geopolitical data.

## Installation

```bash
npm install @c0smic/conflict-globe-server
```

## Usage

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

## API Endpoints

- `GET /api/conflicts` - Get all conflict events
- `GET /api/conflicts?category=maritime` - Filter by category

## Environment Variables

```env
PORT=8080
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
ACLED_KEY=
ACLED_EMAIL=
WINDY_KEY=
AISSTREAM_KEY=
NEWSAPI_KEY=
GDELT_KEY=
```

## Docker

```bash
docker run -p 8080:8080 c0smic/conflict-globe-server
```

## License

MIT
