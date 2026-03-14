<div align="center">

# Conflict Globe 🌍

**A real-time 3D OSINT visualization platform for global conflict and geopolitical events**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/r13xr13/conflict-globe.gl/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-98%25-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Demo](#demo) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Contributing](#contributing)

<br/>

![Conflict Globe](https://raw.githubusercontent.com/r13xr13/conflict-globe.gl/main/Screenshot_07-Mar_00-33-44_13941.png)

![Conflict Globe](https://raw.githubusercontent.com/r13xr13/conflict-globe.gl/main/Screenshot_11-Mar_21-07-37_14287.png)

</div>

---

## Overview

Conflict Globe is an open-source intelligence (OSINT) platform that aggregates and visualizes global conflict, maritime, air, cyber, and geopolitical events in real time on an interactive 3D globe. Built for analysts, researchers, and journalists who need a high-signal, low-latency view of world events.

> **Demo**: [▶ Watch on YouTube](https://youtu.be/e52LPDBjIAQ)
>
> **Discord**: [Join the community](https://discord.gg/zRyBE6S7YG)

---

## Features

### Real-Time Data Pipeline

- Live OSINT feed aggregation from multiple independent sources
- WebSocket (Socket.io) push updates — no client polling required
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

- Dark / Light themes
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

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

docker compose up -d

open http://localhost:8080
```

### Local Development

Requires Node.js ≥ 18.

```bash
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

# Install dependencies
cd client-3d && npm install
cd ../server && npm install

# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client-3d && npm run dev
```

---

## Configuration

Create a `.env` file in the `server/` directory. All API keys are optional — many data feeds work without authentication.

```env
# API Keys (optional)
NEWS_API_KEY=your_key_here
GDELT_KEY=your_key_here

# Server
PORT=8080
NODE_ENV=development
```

### Data Sources

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
├── client-3d/          # React + Vite frontend (TypeScript)
│   ├── src/
│   │   └── App.tsx     # Root globe component & state
│   └── package.json
├── server/             # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts    # Entry point & Socket.io setup
│   │   ├── routes/     # REST API endpoints
│   │   └── services/   # Per-source OSINT data fetchers
│   └── package.json
├── globe.gl/           # Vendored custom globe.gl build
├── Dockerfile
└── docker-compose.yml
```

**Data flow:** OSINT sources → Express REST & Socket.io → React client → globe.gl WebGL renderer

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
- Configurable max point count (50–500) to match hardware capability
- Auto-refresh throttling prevents API rate-limit exhaustion
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

## Deployment

### Railway (Cloud — Recommended)

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Railway auto-detects the Dockerfile — no extra config needed
3. Add environment variables in the Railway dashboard
4. Every push to `main` triggers an automatic redeploy

```env
PORT=8080
NODE_ENV=production
```

### Self-Hosted

```bash
docker compose up -d
```

---

## Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a pull request against `main`

---

## License

Distributed under the [MIT License](LICENSE).

---

## Acknowledgements

- [globe.gl](https://github.com/vasturiano/globe.gl) — WebGL globe rendering by Vasco Asturiano
- [three-globe](https://github.com/vasturiano/three-globe) — Three.js globe plugin
- [GDELT Project](https://www.gdeltproject.org/) — Primary open-source event data provider
