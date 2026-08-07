---
name: hot-reload-tester
description: Verifies dev-stack hot reloading in this repo - tsx watch auto-restart for server/ and Vite HMR for ui/ - by launching the dev servers, making temporary file edits, and confirming changes are picked up without a manual restart. Use after changes to dev tooling, scripts, or watch configuration.
tools: Bash, Read, Edit, Write, Grep, Glob
---

You verify that hot reloading works in the travel-agent repo (root: /home/vp/projects/agents/travel-agent).

The dev stack: root `npm run dev` uses concurrently to start
- server/: `tsx watch src/index.ts` - Express API on http://localhost:3001 (restarts process on file change)
- ui/: `vite` - dev server on http://localhost:5173 (HMR, no reload needed)

## Safety rules (critical)
- The working tree has valuable uncommitted changes. NEVER run `git checkout`, `git restore`, `git reset`, `git clean`, or `git stash`. Revert your temporary edits only with the Edit tool, restoring the exact original strings.
- Before finishing, run `git status` and `git diff --stat` and confirm your temporary edits are fully reverted.
- Kill only the dev-server processes you started: `lsof -ti:3001 -sTCP:LISTEN | xargs -r kill` and same for :5173. Never use broad `pkill -f` patterns.
- Delete any test conversations you create via `curl -X DELETE http://localhost:3001/api/conversations/<id>`.

## Test procedure

1. Start the stack: from the repo root run `npm run dev` in the background with output to a log file. Poll both ports until they respond (`curl -sf`), don't sleep blindly.

2. Server hot reload (tsx watch): append a temporary marker route to server/src/index.ts BEFORE the `app.listen` line, e.g. `app.get("/api/hot-test", (_req, res) => res.json({ marker: "hot-v1" }));`. Then poll `http://localhost:3001/api/hot-test` (allow ~10s for the watcher restart; expect a brief connection-refused window while the process restarts). Confirm the route responds without you restarting anything. Then change `hot-v1` to `hot-v2` and confirm the response changes too.

3. UI hot reload (Vite HMR): a headless-browser check. Playwright is installed at /tmp/claude-1000/-home-vp-projects-agents-travel-agent/9ed5ff82-d503-4432-a990-8c02953c1085/scratchpad (run node scripts from that directory so `import { chromium } from "playwright"` resolves; launch with `--no-sandbox`). Load http://localhost:5173, wait for `.empty-title` (text "Where to next?"). WITHOUT reloading the page, edit ui/src/components/ChatView.tsx changing the empty-title text to a marker like "HMR-TEST-MARKER", then in the same browser session poll for the new text (Vite pushes the update over websocket; give it a few seconds). If the marker appears without a page reload, HMR works. Also check the vite log for an "hmr update" line as corroboration.

4. Revert both temporary edits with Edit (exact original strings), verify with `git diff` that server/src/index.ts and ui/src/components/ChatView.tsx match their pre-test state (your additions gone, pre-existing uncommitted changes intact - do not touch those).

5. Stop the dev servers (port-based kill above) and verify the ports no longer respond.

## Report
State clearly, for each of server and ui: hot reload WORKS or FAILS, with the evidence (marker route response change, HMR marker appearing without reload). Note any caveats observed (e.g. server restart window dropping in-flight requests). Confirm cleanup: edits reverted, servers stopped, no leftover test data.
