# Handoff: the "Sketchbook" pattern — AI brainstorming via Excalidraw sketches

Written 2026-06-10 for Burak, who wants to turn this into a standalone Claude Code skill.
This documents exactly what was built in this folder, why each piece exists, and the
pitfalls already paid for so the skill doesn't rediscover them.

## What it is

During brainstorming, instead of (only) writing text, Claude draws hand-drawn-style
Excalidraw sketches — landscape maps, trade-off "doors", vibe panels, architecture
diagrams — and the user views them live in a browser at `http://localhost:8123`,
plus receives PNG screenshots in the conversation. New sketches appear in the open
browser tab automatically (the page polls and reloads).

## The moving parts (all in this folder)

| File | Role |
|---|---|
| `sketches.js` | The data. `window.SKETCHES = [{id, title, elements}, ...]` where `elements` is Claude's shorthand (see below). Claude appends a new entry per sketch with the Edit tool. |
| `index.html` | The viewer. Loads React + `@excalidraw/excalidraw@0.18.0` from esm.sh, converts shorthand via `convertToExcalidrawElements`, renders read-only, fit-to-content. Nav bar with one button per sketch. Polls `sketches.js` every 3s and reloads on change. `?s=<id>` selects a sketch; `?shot=1` hides the nav for screenshots. |
| `shoot.js` | Screenshotter. puppeteer-core + system Chromium (`/usr/bin/chromium`), navigates to each sketch with `&shot=1`, waits for `window.__READY === true`, saves PNGs to `/tmp/connections-shots/`. Run it **from this folder** (node_modules lives here). |
| `node_modules/` | Only dependency: `puppeteer-core` (no bundled browser). Gitignored. |

## The workflow loop (what the skill should automate)

1. One-time: serve the folder — `python3 -m http.server 8123` (background), and
   `xdg-open http://localhost:8123` once so the user has the tab.
2. Per sketch:
   a. Append a `{id, title, elements}` entry to `sketches.js` (Edit tool).
   b. `node shoot.js` (from this folder) → PNGs.
   c. Send the new PNG to the user in-conversation (Claude Code: `SendUserFile`) —
      this also reaches them on mobile via remote control.
   d. Optionally `xdg-open "http://localhost:8123/index.html?s=<id>"` to focus it.
3. Claude should Read the PNG itself once after drawing — layout bugs (overlaps,
   clipped text) are visible that way and worth one self-check.

## The shorthand element format

Same as Excalidraw's "skeleton" format accepted by `convertToExcalidrawElements`:
plain elements (`rectangle`, `ellipse`, `diamond`, `arrow`, `text`) with optional
`label: {text, fontSize}` on shapes/arrows for auto-centered bound text. Two
pseudo-element types from the MCP dialect are filtered out by `index.html`:
`cameraUpdate` (viewport hints, meaningless in the static viewer) and
`delete` (applied: listed ids are removed). Raw `startBinding`/`endBinding`
fields are stripped before conversion — arrows live at their drawn coordinates.

Layout rules of thumb that produced readable sketches: fontSize ≥ 14 (16+ for
body), labeled boxes ≥ 120×60, ~30px gaps, soft pastel fills
(`#a5d8ff #b2f2bb #ffd8a8 #d0bfff #fff3bf #c3fae8 #ffc9c9 #eebefa`), one
goofy decoration per sketch drawn last.

## Pitfalls already hit (don't rediscover these)

1. **The claude.ai Excalidraw MCP canvas is invisible from Claude Code.** The first
   five sketches were drawn via `mcp__claude_ai_Excalidraw__create_view` and the user
   saw nothing. The MCP tools render in claude.ai-style clients only. This local
   viewer exists because of that. (The MCP's `read_checkpoint` does return the
   shorthand elements, so past MCP sketches can be recovered into `sketches.js`.)
2. **Font measurement race → clipped labels.** Excalidraw loads its handwriting font
   (Excalifont) lazily, only after text is on screen. If you convert elements before
   the font is loaded, text widths are measured with a fallback font and every label
   renders clipped. Fix in `index.html`: render once (triggers the font fetch),
   `await document.fonts.ready` + small delay, then convert **again** and
   `updateScene` — the second pass measures correctly. Keep this double-convert.
3. **Headless `chromium --screenshot --virtual-time-budget` is a trap.** Virtual time
   fast-forwards `setTimeout`/`Date.now`, so wait-for-font loops expire instantly and
   you screenshot mid-render. That's why `shoot.js` uses puppeteer-core with
   `waitForFunction("window.__READY === true")` — the page sets `__READY` only after
   the double-convert and fit-to-content. Don't go back to raw `--screenshot`.
4. **Run `node shoot.js` from this folder**, not the repo root — `puppeteer-core`
   resolves from `sketchbook/node_modules`.
5. esm.sh needs the `?deps=react@18.3.1,react-dom@18.3.1&bundle` pin on the
   Excalidraw import plus the import map, or you get duplicate-React hook errors.
6. `window.EXCALIDRAW_ASSET_PATH` must point at the package's `dist/prod/` on the
   CDN or fonts 404.

## Ideas for the skill version

- Parameterize: port, output dir, project name (paths here are Connections-specific
  in `shoot.js`'s default OUT dir only).
- A tiny `add-sketch` helper (append entry + shoot + send) would collapse the
  per-sketch loop to one command.
- Keep sketches as *data committed to the repo* — they double as design history
  (this brainstorm's seven sketches are the visual minutes of the meeting).
- Possible upgrade: export real `.excalidraw` files (post-conversion elements are
  valid scene elements) so users can edit sketches and hand them back.
