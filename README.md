# Options Trade Planner

A full-stack web application for planning, analyzing, and executing options trades. Features a trading-terminal dark UI with live market data, options chain scanning, P&L diagrams, strategy recommendations, and exportable trade plans.

## Features

- **Trade Setup** — Ticker lookup with live quotes, directional bias (bullish/bearish/neutral), account size & risk management, holding period, target R:R
- **Options Chain Scanner** — Live options chain with filters (delta, volume, OI, spread), contract scoring, and top recommendations flagging wide spreads and low liquidity
- **Risk/Reward Calculator** — Multi-leg position builder (calls, puts, spreads, condors, straddles), P&L diagram at expiry with Black-Scholes intermediate curves
- **Market Context** — SPY/QQQ trend vs 9/21/50/200 EMAs, VIX level + IV rank gauge, ATR/support/resistance, earnings detection, market signal ("favors entries / caution / neutral")
- **Strategy Recommender** — Rule-based engine mapping IV environment + directional bias to optimal strategies (long call, debit spread, bull put spread, iron condor, etc.) with rationale
- **Trade Plan Generator** — Structured plan with entry/stop/targets/position size/Greeks, copy to clipboard or download as `.txt`

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (dark terminal theme) |
| Charts | Recharts |
| State | Zustand (persisted to localStorage) |
| Data fetching | TanStack React Query |
| Backend | Node.js + Express + TypeScript |
| Market data | yahoo-finance2 (unofficial Yahoo Finance API) |
| Caching | node-cache (TTL-based) |
| Options pricing fallback | Black-Scholes (client-side) |

## Setup

### Prerequisites
- Node.js 18+

### 1. Clone and install

```bash
git clone <repo>
cd Options-Trader
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` in the root and fill in values:

```bash
cp .env.example .env
```

Optional: Add a Tradier sandbox token for additional data sources.

### 3. Run development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

Then open `http://localhost:5173`.

### 4. Production build

```bash
cd client && npm run build    # outputs to client/dist/
cd server && npm run build    # outputs to server/dist/
```

## Data Sources

- **Primary**: Yahoo Finance unofficial API via `yahoo-finance2` npm package. No API key required.
- **Fallback**: Black-Scholes model computes option prices and Greeks from manual inputs when live chain data is unavailable.
- **Rate limiting**: 100 req/15min on chain endpoints, 300 req/15min on quotes. In-memory cache prevents repeated requests.

> Warning: **Paper Data Only** — This application uses delayed/unofficial market data and is intended for planning and education only. Not investment advice.

## Project Structure

```
Options-Trader/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # UI components by feature
│       ├── hooks/       # React Query hooks
│       ├── services/    # Axios API client
│       ├── store/       # Zustand state stores
│       ├── types/       # TypeScript interfaces
│       └── utils/       # Black-Scholes, P&L, formatters, strategy engine
└── server/              # Express backend
    └── src/
        ├── routes/      # API route handlers
        ├── services/    # Yahoo Finance + cache services
        └── middleware/  # Error handling + rate limiting
```
