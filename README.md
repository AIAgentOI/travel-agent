# AI Travel Planner Agent

An LLM-powered travel planning assistant. It gathers your trip requirements conversationally, calls real-data tools, and produces a personalized day-by-day itinerary.

**Stack:** TypeScript + [Vercel AI SDK](https://ai-sdk.dev) with the OpenAI provider (`gpt-5-mini`).

## Tools

| Tool | Data source |
|---|---|
| `geocode` | Open-Meteo Geocoding API (free, no key) |
| `weather` | Open-Meteo Forecast API (free, no key) |
| `attractions` | OpenStreetMap Overpass API (free, no key) |
| `budget` | Built-in cost-of-living tier calculator (ground costs only, no flights) |
| `updateProfile` | Saves budget style, interests, pace, and traveler count to Postgres so they're remembered next session |

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_api_key_here
DATABASE_URL=postgres://...
```

`DATABASE_URL` is a Postgres connection string (e.g. a Supabase project's connection string) used to persist the traveler profile across sessions. The `traveler_profile` table is created automatically on first run.

## Run

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

Example:

```
you> Plan a 10-day trip to Lisbon in October with a mid-range budget. I enjoy food, architecture, contemporary art, Renaissance art museums, and coffee shops.
```

The agent geocodes the destination, checks the forecast, pulls POIs matching your interests, estimates costs, and writes a day-by-day markdown itinerary with a budget table. Follow up conversationally ("make day 2 more relaxed") - it keeps the full conversation history.

It also remembers your budget style, interests, pace, and traveler count across sessions (via Postgres) - state them once and future runs won't re-ask.

## Roadmap

- **V1** - agent + tools + itinerary generation
- **V2 (this)** - persistent memory: remember budget style, interests, and pace across sessions
- **V3** - planning workflows: specialized agents with validation and optimization (budget, distance, schedule)
