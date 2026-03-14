<div align="center">

# Conflict Globe

**A real-time 3D OSINT visualization platform with AI-powered Discord bot**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/r13xr13/conflict-globe.gl/releases)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/)
[![npm](https://img.shields.io/badge/npm-ready-CB3837?logo=npm&logoColor=white)](https://npmjs.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Demo](#demo) · [Features](#features) · [Installation](#installation) · [Discord Bot](#discord-bot) · [Configuration](#configuration) · [Deployment](#deployment) · [Package](#package)

<br/>

[![Conflict Globe](https://raw.githubusercontent.com/r13xr13/conflict-globe.gl/master/screenshot.png)

</div>

---

## Overview

Conflict Globe is an open-source intelligence (OSINT) platform that aggregates and visualizes global conflict, maritime, air, cyber, and geopolitical events in real-time on an interactive 3D globe. It includes an AI-powered Discord bot that analyzes events and posts tailored updates to your server.

> **Demo**: [Watch the platform demo](https://www.youtube.com/watch?v=EvRL27Z5uh4)
> 
> **Discord**: [Join Our Discord](https://discord.gg/zRyBE6S7YG)

---

## Features

### 3D Globe Visualization
- **Real-time OSINT aggregation** from 70+ data sources
- **WebSocket push updates** — no polling required on the client

### Visualization Layers
| Layer | Description |
|---|---|
| Points | Individual event markers with per-category color coding |
| HexBins | Hexagonal spatial clustering for density analysis |
| Heatmap | Continuous density surface from event distribution |
| Rings | Animated pulse rings at active event locations |
| Arcs | Directional connections between correlated events |
| Paths | Movement and trajectory tracking |

### Event Categories
`Conflict` · `Maritime` · `Air` · `Cyber` · `Land` · `Space` · `Radio` · `Weather` · `Earthquakes` · `Social Media` · `Cameras`

### Discord Bot
- **AI-powered analysis** using Ollama with model selection per category
- **Multi-channel distribution**:
  - `#live-updates` — Real-time conflict events (every 15 min)
  - `#general` — AI-written news articles (every hour)
  - `#dev` — Server stats (every hour)
  - `#threat-alerts` — Critical threat alerts (every 30 min)
- **Slash commands** for on-demand reports

### AI Agent
- Fetches all 10 categories from Conflict Globe API
- Selects best Ollama model per category:
  - `llama3.2:latest` — conflict, cyber, social, cameras
  - `qwen2.5:7b` — maritime, space
  - `llama3.1:8b-instruct` — air
  - `mistral:latest` — weather, earthquakes
  - `phi3:latest` — radio
- Analyzes: threat level, category, indicators, sentiment, escalation potential

---

## Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

# Start the server
docker compose up -d

# Access the app
open http://localhost:8080
```

### Option 2: Local Development (npm)

```bash
# Clone the repository
git clone https://github.com/r13xr13/conflict-globe.gl.git
cd conflict-globe.gl

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client-3d && npm install

# Start the backend (Terminal 1)
cd server && npm run dev

# Start the frontend (Terminal 2)
cd client-3d && npm run dev
```

### Option 3: Homebrew

```bash
# Tap the package (if published)
brew tap conflict-globe/tap
brew install conflict-globe

# Run the service
conflict-globe start
```

---

## Discord Bot Setup

### Prerequisites
- [Ollama](https://ollama.ai/) running locally or remotely
- A Discord bot token ([create here](https://discord.com/developers/applications))

### Configuration

1. Copy the example environment file:
```bash
cd discord-bot
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here

# Conflict Globe API URL
CONFLICT_GLOBE_API=http://localhost:8080/api/conflicts

# Ollama API URL
OLLAMA_BASE_URL=http://localhost:11434

# Channel IDs
LIVE_UPDATES_CHANNEL_ID=your_channel_id
THREAT_ALERTS_CHANNEL_ID=your_channel_id
GENERAL_CHANNEL_ID=your_channel_id
DEV_CHANNEL_ID=your_channel_id
```

3. Install and run:
```bash
cd discord-bot
npm install
node index.js
```

### Slash Commands
- `/status` — Check bot and system status
- `/threats` — Get current critical threats
- `/news` — Fetch latest news
- `/events` — Get recent events

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys (optional - many sources work without keys)
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
ACLED_KEY=
ACLED_EMAIL=
WINDY_KEY=
AISSTREAM_KEY=
NEWSAPI_KEY=
GDELT_KEY=

# Discord Bot
DISCORD_BOT_TOKEN=

# Server
PORT=8080
NODE_ENV=production
```

### Data Sources

The platform aggregates from 70+ OSINT providers:

| Category | Sources |
|---|---|
| Conflict | BBC, ACLED, IDF, NATO, Reuters, AP |
| Maritime | AISStream, MarineTraffic |
| Air | OpenSky Network, ADS-B Exchange |
| Cyber | BleepingComputer, HackRead |
| Space | Space-Track, CelesTrak |
| Weather | NOAA, Windy.com |
| Earthquakes | USGS, EMSC |
| Social | Reddit, Telegram OSINT |

---

## Architecture

```
conflict-globe.gl/
├── client-3d/              # React + Vite frontend
│   └── src/App.tsx         # Globe component
├── server/                  # Express + TypeScript backend
│   └── src/index.ts        # API + Socket.io
├── discord-bot/            # Discord bot with AI agent
│   ├── index.js           # Bot commands & scheduler
│   └── ai-agent.js        # Ollama AI integration
├── Dockerfile
├── docker-compose.yml
└── railway.json           # Railway deployment config
```

**Data Flow:** OSINT Sources → Server API → 3D Globe + Discord Bot → Users

---

## Deployment

### Railway (Cloud)

1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main

```env
PORT=8080
NODE_ENV=production
# Add API keys as needed
```

### Docker Swarm

```bash
docker stack deploy -c docker-compose.yml conflict-globe
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

---

## Publishing the Package

### To npm

```bash
# Update version in package.json
npm version patch

# Login to npm
npm login

# Publish
npm publish
```

### To Homebrew

```bash
# Create a tap
brew tap conflict-globe/tap

# Formula location
# https://github.com/conflict-globe/homebrew-tap
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, react-globe.gl, Three.js, TypeScript |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Bot | Discord.js, Ollama, node-cron |
| Data | Axios, RSS parsers, REST OSINT APIs |
| Infrastructure | Docker, Railway, npm |

---

## Performance

- Client-side point clustering for large event volumes
- Configurable max points (50-500)
- Auto-refresh throttling to prevent rate limits
- Memoized data processing

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| R | Force data refresh |
| F | Toggle sidebar |
| H | Toggle dark/light theme |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/name`
3. Commit your changes
4. Open a pull request

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Acknowledgements

- [globe.gl](https://github.com/vasturiano/globe.gl) — WebGL globe rendering
- [Ollama](https://ollama.ai/) — Local AI inference
- [Discord.js](https://discord.js.org/) — Bot framework
- All OSINT data providers
