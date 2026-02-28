# Claude Code Metrics

English | [日本語](README.md)

A self-hosted dashboard for visualizing and analyzing local Claude Code usage data (`~/.claude`).

Understand token usage, API costs, cache efficiency, and per-project statistics through intuitive charts.

**Live Demo (no install required):** https://keita1992.github.io/claude-code-metrics/

![Screenshot](docs/screenshot.png)

## Features

- **Overview Dashboard** — KPI summary of sessions, estimated costs, and cache savings
- **Daily/Weekly Trends** — Time-series visualization of token usage, costs, and session counts
- **Model Analysis** — Compare token usage, costs, and cache hit rates per model
- **Project Statistics** — Aggregate usage and tool frequency per project
- **Optimization Insights** — Cache efficiency analysis, model downgrade suggestions, and peak usage hour detection

## Requirements

| Item | Requirement |
|------|-------------|
| **OS** | macOS, Linux |
| **Windows** | Works via Windows Subsystem for Linux (WSL) |
| **Node.js** | 18+ (already present if Claude Code is installed) |
| **git** | Any version |
| **Python** | Installed automatically via uv (Python 3.13) |
| **Data** | `~/.claude` directory must exist (Claude Code usage history) |

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/keita1992/claude-code-metrics/main/install.sh | sh
```

After installation, start with:

```bash
claude-code-metrics
```

Your browser will open automatically with the dashboard.

### Command Options

```bash
claude-code-metrics              # Start on default port (3099)
claude-code-metrics --port 8080  # Start on a custom port
claude-code-metrics --update     # Update to the latest version
claude-code-metrics --uninstall  # Uninstall
claude-code-metrics --help       # Show help
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13 / FastAPI / Polars / orjson |
| Frontend | React 19 / TypeScript 5.7 / Vite 6 / Tailwind CSS 4 / Recharts 2 |
| Package Management | uv (Python) / npm (Node.js) |

## Project Structure

```
claude-code-metrics/
├── backend/
│   ├── main.py                # FastAPI application (includes static file serving)
│   ├── config.py              # Settings & price table
│   ├── routers/               # API endpoints
│   │   ├── overview.py        #   GET /api/overview
│   │   ├── daily.py           #   GET /api/daily
│   │   ├── models.py          #   GET /api/models
│   │   ├── projects.py        #   GET /api/projects
│   │   └── insights.py        #   GET /api/insights
│   ├── services/              # Business logic
│   │   ├── aggregator.py      #   Data aggregation engine (with TTL cache)
│   │   ├── jsonl_parser.py    #   JSONL parser
│   │   ├── cost_calculator.py #   Cost calculation
│   │   ├── insight_engine.py  #   Insight generation
│   │   └── stats_cache.py     #   stats-cache fallback reader
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Route definitions
│   │   ├── api/client.ts      # API client & type definitions
│   │   ├── i18n/              # Translations (ja/en)
│   │   ├── pages/             # Page components (6 screens)
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── DailyTrendsPage.tsx
│   │   │   ├── HeatmapPage.tsx
│   │   │   ├── ModelAnalysisPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   └── InsightsPage.tsx
│   │   └── components/        # Shared UI components
│   │       ├── Layout.tsx     #   Sidebar + content area
│   │       ├── Sidebar.tsx    #   Navigation menu
│   │       └── StatCard.tsx   #   KPI card
│   └── package.json
├── install.sh                 # One-command installer
└── docker-compose.yml         # Docker alternative (for developers)
```

## API Endpoints

| Method | Path | Parameters | Description |
|--------|------|-----------|-------------|
| GET | `/api/health` | — | Health check |
| GET | `/api/overview` | — | KPIs, daily tokens, cost by model, hourly activity |
| GET | `/api/daily` | `start` `end` (YYYY-MM-DD), `mode` (daily\|weekly) | Daily/weekly trends |
| GET | `/api/models` | — | Usage, cost, and cache efficiency per model |
| GET | `/api/projects` | — | Per-project stats and tool usage |
| GET | `/api/insights` | — | Cache efficiency, optimization suggestions, peak hours |

## Architecture

```
Browser
  │
  ▼
FastAPI (:3099)
  ├── /api/*  → API routers (various endpoints)
  └── /*      → frontend/dist/ static files + SPA catch-all
                  │
                  └─ ~/.claude/projects/**/*.jsonl ← session logs (direct parse)
                      │
                      ▼
                  Aggregation (TTL 300s) → Cost calculation → Insight generation → JSON response
```

**Data Flow:**

1. Read and parse all JSONL files under `~/.claude/projects/`
2. Aggregate token usage, models, dates, and hours using Polars
3. Calculate model-specific costs using the cost engine
4. Generate optimization suggestions via the insight engine
5. Cache results in memory for 300 seconds for fast re-requests

## Supported Models and Pricing

| Model | Model ID | Input | Output | Cache Read | Cache Creation |
|-------|----------|------:|-------:|-----------:|---------------:|
| Opus 4.6 | `claude-opus-4-6` | $5.00 | $25.00 | $0.50 | $6.25 |
| Opus 4.5 | `claude-opus-4-5-20251101` | $5.00 | $25.00 | $0.50 | $6.25 |
| Sonnet 4.5 | `claude-sonnet-4-5-20250929` | $3.00 | $15.00 | $0.30 | $3.75 |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 | $3.75 |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1.00 | $5.00 | $0.10 | $1.25 |

*(USD / 1M tokens)*

> If an undefined model is detected, a warning is shown on the dashboard.

## Local Development

For frontend hot-reload, run two processes:

### Backend

```bash
cd backend
export CLAUDE_DATA_DIR=~/.claude
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8099 --reload
```

### Frontend (Vite Dev Server)

```bash
cd frontend
npm install
npm run dev
```

> The Vite dev server defaults to `:3099` and proxies `/api` requests to the backend at `:8099`.

## Alternative: Docker Compose

For developers using Docker:

```bash
git clone https://github.com/keita1992/claude-code-metrics.git
cd claude-code-metrics
cp .env.example .env
# Edit CLAUDE_HOST_DIR in .env
docker compose up --build
```

Access: http://127.0.0.1:3099

## Security Notes

- **Local-only design**: The server binds to `127.0.0.1` and is not accessible from external networks
- **No data transmission**: Collected data is never sent to external servers — all processing happens locally
- **No authentication**: The dashboard has no access control. Avoid using on shared machines or with SSH port forwarding unless you're comfortable with others seeing your Claude usage history
- **Not designed for public server deployment**

## License

MIT License
