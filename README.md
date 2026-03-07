# Conflict Globe 🌍

A real-time 3D OSINT visualization platform for global conflict and geopolitical events. Built with Three.js/globe.gl, React, and Node.js.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## Features

### Real-Time Data
- Live OSINT feed aggregation from multiple sources
- WebSocket support for real-time updates
- Auto-refresh with configurable intervals

### Visualizations
- **Points** - Individual event markers with category coloring
- **HexBins** - Hexagonal clustering for density analysis
- **Heatmaps** - Event density visualization
- **Rings** - Pulse rings at event locations
- **Arcs** - Directional connections between events
- **Paths** - Movement tracking
- **Polygons** - Regional aggregation

### Globe Features
- Dark/Light themes
- Atmosphere effect
- Cloud layer
- Graticules (lat/long grid)
- Bump mapping for terrain
- Auto-rotation
- Point clustering for performance

### Interactions
- Click any point for detailed event information
- Hover tooltips with quick preview
- Timeline slider for temporal filtering
- Category filters
- Full-text search
- Export to JSON/GeoJSON

### Categories
- ⚔️ Conflict
- 🚢 Maritime
- ✈️ Air
- 💻 Cyber
- 🏗️ Land
- 🛰️ Space
- 📡 Radio
- 🌤 Weather
- 🌍 Earthquakes
- 📱 Social Media

## Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

# Build and run with Docker
docker compose up -d

# Access the application
open http://localhost:8080
```

### Development

```bash
# Install dependencies
cd client-3d && npm install
cd ../server && npm install

# Run development servers
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Client
cd client-3d && npm run dev
```

## Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# API Keys (optional - some feeds work without)
NEWS_API_KEY=your_key_here
GDELT_KEY=your_key_here

# Server Config
PORT=8080
NODE_ENV=development
```

### Data Sources

The server aggregates from multiple OSINT sources:
- GDELT Project
- UCDP Armed Conflict
- MarineTraffic
- ADS-B Exchange
- Satellite tracking
- RSS News feeds
- And more...

## Architecture

```
conflict-globe.gl/
├── client-3d/          # React + Vite frontend
│   ├── src/
│   │   └── App.tsx     # Main globe component
│   └── package.json
├── server/              # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts   # Server entry + Socket.io
│   │   ├── routes/     # API endpoints
│   │   └── services/   # Data fetchers
│   └── package.json
├── globe.gl/           # Custom globe library (optional)
├── Dockerfile
└── docker-compose.yml
```

## Tech Stack

- **Frontend**: React, Vite, react-globe.gl, Three.js
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Data**: Axios, RSS parsers, OSINT APIs
- **Deployment**: Docker, Docker Compose

## Performance

- Point clustering for large datasets
- Configurable max points (50-500)
- Auto-refresh throttling
- Memoized data processing
- Lazy loading with code splitting

## Keyboard Shortcuts

- `R` - Refresh data
- `F` - Toggle sidebar
- `H` - Toggle theme

## Export Formats

- JSON - Full event data
- GeoJSON - GIS-compatible format
- CSV - Spreadsheet compatible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE for details.

## Credits

- [globe.gl](https://github.com/vasturiano/globe.gl) - 3D globe visualization
- [three-globe](https://github.com/vasturiano/three-globe) - Three.js globe plugin
- [OSINT sources](https://www.gdeltproject.org/) - Data providers

---

