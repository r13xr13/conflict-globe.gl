<div align="center">

# Conflict Globe

**A real-time 3D OSINT visualization platform for global conflict and geopolitical events**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/r13xr13/conflict-globe.gl/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-98%25-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Demo](#demo) · [Quick Start](#quick-start) · [Documentation](#architecture) · [Contributing](#contributing)

<br/>

![Conflict Globe Screenshot](https://raw.githubusercontent.com/r13xr13/conflict-globe.gl/master/Screenshot_13-Mar_15-06-05_29016.png)

</div>

---

## Overview

Conflict Globe is an open-source intelligence (OSINT) platform that aggregates and visualizes global conflict, maritime, air, cyber, and geopolitical events in real time on an interactive 3D globe. It is designed for analysts, researchers, and journalists who need a high-signal, low-latency view of world events.

> ## **Demo**
> [▶ Watch a demo of the platform on YouTube](https://youtu.be/9CiMCsz2Smk))
> ## Discord
> [Join Our Discord](https://discord.gg/zRyBE6S7YG)
---

## Features

### Real-Time Data Pipeline
- Live OSINT feed aggregation from multiple independent sources
- WebSocket (Socket.io) push updates — no polling required on the client
- Configurable auto-refresh intervals per source

### Visualization Layers
| Layer | Description |
|---|---|
| **Points** | Individual event markers with per-category color coding |
| **HexBins** | Hexagonal spatial clustering for density analysis |
| **Heatmap** | Continuous density surface from event distribution |
| **Rings** | Animated pulse rings at active event locations |
| **Arcs** | Directional connections between correlated events |
| **Paths** | Movement and trajectory tracking |
| **Polygons** | Regional boundary and aggregation overlays |

### Globe Controls
- Dark / Light themes with one-click toggle
- Atmospheric glow, cloud layer, and bump-mapped terrain
- Lat/long graticule grid overlay
- Auto-rotation with drag-to-pause
- Client-side point clustering for smooth performance at scale

### Interaction & Filtering
- Click any marker for a full event detail panel
- Hover tooltips for at-a-glance previews
- Timeline slider for temporal filtering
- Category filter toggles
- Full-text search across all loaded events
- Export to **JSON**, **GeoJSON**, or **CSV**

### Event Categories
`Conflict` · `Maritime` · `Air` · `Cyber` · `Land` · `Space` · `Radio` · `Weather` · `Earthquakes` · `Social Media`

---

## Quick Start

### Docker (Recommended)

The fastest way to run Conflict Globe locally. Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

docker compose up -d

# The app will be available at:
open http://localhost:8080
```

### Local Development

Requires Node.js ≥ 18.

```bash
# Clone the repository
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

# Install dependencies for both packages
cd client-3d && npm install
cd ../server && npm install

# Start the backend (Terminal 1)
cd server && npm run dev

# Start the frontend (Terminal 2)
cd client-3d && npm run dev
```

The development client will hot-reload on file changes. The server runs with `ts-node-dev` for TypeScript reloading.

---

## Configuration

### Environment Variables

Create a `.env` file in the `server/` directory. All API keys are optional — many data feeds are available without authentication.

```env
# ── API Keys (optional)
NEWS_API_KEY=your_key_here
GDELT_KEY=your_key_here

# ── Server 
PORT=8080
NODE_ENV=development
```

### Data Sources

The server service layer aggregates from the following OSINT providers:

| Source | Domain |
|---|---|
| [GDELT Project](https://www.gdeltproject.org/) | Global events & media |
| [UCDP Armed Conflict](https://ucdp.uu.se/) | Conflict datasets |
| MarineTraffic | Maritime vessel tracking |
| ADS-B Exchange | Live aircraft positions |
| Satellite tracking feeds | Space domain awareness |
| RSS news aggregation | Open-source media feeds |

---

## Architecture

```
conflict-globe.gl/
├── client-3d/              # React + Vite frontend (TypeScript)
│   ├── src/
│   │   └── App.tsx         # Root globe component & state management
│   └── package.json
│
├── server/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts        # Server entry point & Socket.io setup
│   │   ├── routes/         # REST API endpoint definitions
│   │   └── services/       # Per-source OSINT data fetchers
│   └── package.json
│
├── globe.gl/               # Vendored / custom globe.gl build (optional)
├── Dockerfile
└── docker-compose.yml
```

**Data flow:** OSINT services → Express REST & Socket.io → React client → globe.gl WebGL renderer

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, react-globe.gl, Three.js, TypeScript |
| **Backend** | Node.js, Express, TypeScript, Socket.io |
| **Data** | Axios, RSS parsers, REST OSINT APIs |
| **Infrastructure** | Docker, Docker Compose |

---

## Performance

- Client-side point clustering keeps render time stable at large event volumes
- Configurable maximum point count (50–500) to match hardware capability
- Auto-refresh throttling prevents rate-limit exhaustion on data sources
- Memoized data processing avoids redundant React renders
- Code-split lazy loading reduces initial bundle size

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `R` | Force data refresh |
| `F` | Toggle sidebar |
| `H` | Toggle dark / light theme |

---

## Contributing

Contributions are welcome. Please follow the steps below:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with a descriptive message
4. Open a pull request against `master`

For significant changes, please open an issue first to discuss the proposed approach.

---

## License

Distributed under the [MIT License](LICENSE).

---

## Acknowledgements

- [globe.gl](https://github.com/vasturiano/globe.gl) — WebGL globe rendering library by Vasco Asturiano
- [three-globe](https://github.com/vasturiano/three-globe) — Three.js globe plugin
- [GDELT Project](https://www.gdeltproject.org/) — Primary open-source event data provider
