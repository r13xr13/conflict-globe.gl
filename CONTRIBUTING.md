# Contributing to Conflict Globe

Thank you for your interest in contributing. Conflict Globe is an open-source OSINT visualization platform, and contributions of all kinds are welcome — from bug fixes and new data source integrations to documentation improvements and UI enhancements.

Please take a few minutes to read this guide before submitting your first contribution.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Adding a Data Source](#adding-a-data-source)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Commit Message Convention](#commit-message-convention)
- [Code Style](#code-style)

---

## Code of Conduct

This project follows a simple standard: be respectful, constructive, and professional. Harassment, discrimination, or bad-faith participation of any kind will not be tolerated.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/conflict-globe.gl.git
   cd conflict-globe.gl
   ```
3. **Create a branch** for your change:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   ```
4. Make your changes, then [open a pull request](#submitting-a-pull-request).

---

## How to Contribute

### Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Your environment (OS, browser, Node version, Docker version if applicable)
- Screenshots or console output if relevant

### Suggesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue template. Before opening a request, please search existing issues to avoid duplicates.

For significant changes (new architecture, new visualization layer, new data pipeline), **open an issue first** to discuss the approach before writing code. This avoids wasted effort if the direction doesn't align with the project roadmap.

### Adding a Data Source

Data source integrations live in `server/src/services/`. Each service should:

- Export a single async function that returns an array of normalized event objects
- Handle its own error recovery and rate-limit backoff
- Include a comment block describing the source, its license/terms, and any required API keys
- Add the source and any required environment variables to the `README.md` and `.env.example`

### Submitting a Pull Request

1. Ensure your branch is up to date with `master`:
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```
2. Run the project locally and verify your change works end-to-end
3. Keep PRs focused — one logical change per PR
4. Fill out the pull request template completely
5. Link any related issues using `Closes #123` in the PR description

A maintainer will review your PR as soon as possible. Please be responsive to feedback — PRs that go stale will be closed.

---

## Development Setup

Requires **Node.js ≥ 18** and **npm ≥ 9**.

```bash
# Install dependencies
cd client-3d && npm install
cd ../server && npm install

# Copy and configure environment
cp server/.env.example server/.env

# Start backend (Terminal 1)
cd server && npm run dev

# Start frontend (Terminal 2)
cd client-3d && npm run dev
```

Alternatively, use Docker Compose:

```bash
docker compose up -d
```

---

## Project Structure

```
conflict-globe.gl/
├── client-3d/          # React + Vite frontend (TypeScript)
│   └── src/
│       └── App.tsx     # Root globe component
├── server/             # Express + TypeScript backend
│   └── src/
│       ├── index.ts    # Entry point & Socket.io
│       ├── routes/     # API endpoints
│       └── services/   # OSINT data fetchers
├── globe.gl/           # Vendored globe library (optional)
├── Dockerfile
└── docker-compose.yml
```

---

## Commit Message Convention

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**
```
feat(services): add ACLED conflict data source
fix(globe): correct heatmap intensity scaling at high zoom
docs: update environment variable reference in README
```

---

## Code Style

- **TypeScript** is required for all new code in both `client-3d/` and `server/`
- Follow the existing ESLint configuration — run `npm run lint` before committing
- Prefer explicit types over `any`
- Keep components and service functions small and single-purpose
- Comment any non-obvious logic, especially around data normalization

---

If you have questions that aren't answered here, feel free to open a discussion or a [New Data Source](.github/ISSUE_TEMPLATE/new_data_source.md) issue.
