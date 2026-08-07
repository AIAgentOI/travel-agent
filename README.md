# AI Travel Planner Agent

An LLM-powered travel planning assistant. It gathers your trip requirements conversationally, calls real-data tools, and produces a personalized day-by-day itinerary - through a browser chat UI with persistent, resumable conversations, an editable memory profile, theme options, and a responsive mobile layout.

**Stack:** TypeScript + [Vercel AI SDK](https://ai-sdk.dev) with the OpenAI provider (`gpt-5-mini`) - Express API server, Postgres, and a Vite + React frontend.

## Structure

```
server/   Express API - agent logic, tools, Postgres, streaming chat endpoint
ui/       Vite + React chat UI
```

## Tools

| Tool | Data source |
|---|---|
| `geocode` | Open-Meteo Geocoding API (free, no key) |
| `weather` | Open-Meteo Forecast API (free, no key) |
| `attractions` | OpenStreetMap Overpass API (free, no key) |
| `budget` | Built-in cost-of-living tier calculator (ground costs only, no flights) |
| `updateProfile` | Saves budget style, interests, pace, and traveler count to Postgres so they're remembered next session |

## UI features

- **Chat** - streaming responses, live tool-call indicators, markdown itinerary rendering, suggestion chips on a new trip
- **Sidebar** - past conversations with auto-generated titles (from the first message via a quick LLM call), resumable at any time. A new conversation row is only created once you actually send a message - clicking "New trip" repeatedly, or on an empty chat, doesn't spam empty rows
- **Profile & memory** - a modal showing exactly what the agent has learned (travel style, interests, pace, traveler count), editable or clearable in case something was a one-off and shouldn't shape future trips
- **Themes** - dark (default), light, and a terminal theme (green on black, monospace), persisted in localStorage
- **Mobile layout** - responsive down to phone widths, with an off-canvas sidebar drawer opened via a hamburger button

## Setup

This repo isn't set up as npm workspaces: root, `server/`, and `ui/` are three independent packages, each with their own dependencies, so each needs its own install:

```bash
npm install
npm --prefix server install
npm --prefix ui install
```

Create a `.env` file in `server/`:

```env
OPENAI_API_KEY=your_api_key_here
DATABASE_URL=postgres://...
```

`DATABASE_URL` is a Postgres connection string (e.g. a Supabase project's connection string) used to persist the traveler profile and chat conversations across sessions. Tables are created automatically on first run.

## Run

```bash
npm run dev
```

This starts the Express API on `http://localhost:3001` and the Vite dev server (with a proxy to the API) on `http://localhost:5173`. Open the Vite URL in your browser.

Run them individually with `npm run dev:server` / `npm run dev:ui`, or typecheck both with `npm run typecheck`.

## Using it

Start a new trip from the sidebar, then describe what you're planning:

```
Plan a 10-day trip to Lisbon in October with a mid-range budget. I enjoy food, architecture, contemporary art, Renaissance art museums, and coffee shops.
```

The agent geocodes the destination, checks the forecast, pulls POIs matching your interests, estimates costs, and writes a day-by-day markdown itinerary with a budget table. Follow up conversationally ("make day 2 more relaxed") - it keeps the full conversation history.

It also remembers your budget style, interests, pace, and traveler count across sessions (via Postgres) - state them once and future conversations won't re-ask. Check or edit what it has learned any time from **Profile & memory** in the sidebar - useful if a one-time preference (e.g. a single mountain trip) shouldn't be treated as a standing preference.

## Roadmap

- **V1** - agent + tools + itinerary generation
- **V2** - persistent memory: remember budget style, interests, and pace across sessions
- **V3 (this)** - web UI: streaming chat over HTTP, conversations persisted to Postgres, resumable chat history, editable memory profile, themes, mobile layout
