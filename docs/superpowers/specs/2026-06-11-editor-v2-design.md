# Connections Editor v2 — Design Spec

**Date:** 2026-06-11
**Status:** Approved by Burak (brainstorm 2026-06-11)
**Builds on:** `2026-06-10-connections-design.md` (phase 1, shipped) — this spec is the editor overhaul that precedes the crypto phase.

## What this is

An all-out UI/UX upgrade of the phase-1 editor plus a richer data model: free-form node fields, five node shapes with size presets, fully customizable edges, modern canvas interactions, and a polished home screen. No server, no crypto — this is still the local-first app, made genuinely pleasant.

Decisions from the brainstorm (sketches 8–11 in `sketchbook/`):

| Question | Decision |
|---|---|
| Node content | **Free-form fields**: optional list of name→value rows per node, each with its own secret toggle. No typed schemas (can layer later). "As it is now" remains the default — fields appear only when added. |
| Node shapes | Five: rounded, circle, pill, diamond, square. Per-node choice; template node type sets the default. |
| Node size | Presets S / M / L, plus optional drag-resize (stored w/h overrides the preset). |
| Node colors | Preset palette swatches + custom picker; border auto-darkens from fill. |
| Edges | Edge **type defines the look** (color, solid/dashed/dotted, width 1–4, direction arrows none/one/both); any edge can override any property; custom edge types definable per graph. |
| UX scope | All four: canvas interactions, visual polish, layout magic (untangle), home & chrome. |
| Approach | Stay on React Flow; custom node/edge renderers; d3-force for untangle. No stack change. |

## Data model (all additive — old graphs load unchanged)

```ts
// types.ts — additions
export interface NodeField { id: string; name: string; value: string; secret?: boolean }
export type NodeShape = 'rounded' | 'circle' | 'pill' | 'diamond' | 'square'
export type NodeSize = 's' | 'm' | 'l'
export type EdgeStyle = 'solid' | 'dashed' | 'dotted'
export type EdgeDir = 'none' | 'one' | 'both'

export interface NodeData {
  label: string; type: string; x: number; y: number; color: string; notes: string
  secret?: string                 // legacy single secret — still honored (rendered as a masked field)
  fields?: NodeField[]            // NEW free-form rows
  shape?: NodeShape               // NEW; default: node type's shape, else 'rounded'
  size?: NodeSize                 // NEW; default 'm'
  w?: number; h?: number          // NEW; set only by drag-resize, overrides size preset
}

export interface EdgeData {
  from: string; to: string; type: string; label: string
  color?: string; style?: EdgeStyle; width?: number; dir?: EdgeDir   // NEW per-edge overrides
}

export interface NodeTypeDef { id: string; label: string; color: string; shape?: NodeShape }
export interface EdgeTypeDef {
  id: string; label: string
  color?: string; style?: EdgeStyle; width?: number; dir?: EdgeDir   // NEW type-level look
}
```

- **Style resolution** (pure function, unit-tested): edge look = built-in defaults ← edge type's look ← per-edge overrides. Node shape = 'rounded' ← node type's shape ← per-node shape.
- **Custom types per graph:** `meta` gains `customNodeTypes?: NodeTypeDef[]` and `customEdgeTypes?: EdgeTypeDef[]` (plain arrays in the meta Y.Map). Effective types = template types + custom types (custom wins on id collision). Stored in the doc → will sync/encrypt in later phases like everything else.
- **Template edge looks** (built-in): friends — knows: thin gray solid; family: width-3 amber solid; partner: pink solid; coworker: gray dashed. accounts — uses: teal solid, dir 'one'; recovers: amber dashed, dir 'one'. blank — link: gray solid.
- **CRDT caveat (accepted):** `fields` lives as one array value inside the node's Y.Map → concurrent edits to different fields of the same node last-write-win on the whole array. Fine while the app is single-user; phase 4 (multiplayer) must convert `fields` to a Y.Array. Recorded here so it isn't forgotten.
- **Export/import:** exporter writes `version: 2`; importer accepts 1 and 2. Validation stays structural (meta shape, known template, finite x/y) and is lenient about the new optional props (bad values fall back to defaults at render time; arrays/objects in wrong places still rejected).
- **Legacy `secret`:** kept in the data model and UI (shown as a masked "secret" row at the top of the fields list). New secrets should be created as fields with `secret: true`. No silent migration.

## Visual system

- **Custom node component** (one component, all shapes): rounded/pill/square/circle via border-radius, diamond via SVG polygon wrapper. Size presets map to min-width/height + font size (S ≈ 90px, M ≈ 130px, L ≈ 180px). Drag-resize via React Flow `NodeResizer` (enabled when node selected), persisting `w/h` through `doc.ts`.
- States: soft shadow at rest, lift on hover, 2px accent ring + glow when selected; selection ring uses the accent color, not a color change of the node itself. Border color = darkened fill (same auto-darken used everywhere).
- **Custom edge component:** `BaseEdge` with resolved stroke color/dasharray/width; arrowheads via SVG markers honoring `dir` (none/one/both); label as a small pill at the path midpoint (background = panel color so it reads in dark mode).
- **Dark mode:** app-level toggle in the header (sun/moon), persisted in `localStorage('connections.theme')`, applied as `data-theme` on the app root. The per-graph `meta.theme` field stays in the data model but is no longer surfaced (app-level preference wins).
- **Canvas chrome:** React Flow `MiniMap` (bottom-right, node colors), softer dot background, restyled Controls matching the soft theme.
- **Node panel v2:** label, type select, shape picker (5 icons), size picker (S/M/L), palette swatches + custom color input, fields editor (add/rename/edit/delete rows; secret rows masked with per-row Show), notes, delete. Edge panel v2: type select, label, color/style/width/direction controls showing "from type" vs overridden state, plus "reset to type style".

## Interactions

- **Double-click empty canvas** → create node at that position (`screenToFlowPosition`), select it, focus inline rename.
- **Double-click node** → inline rename (input overlay inside the node; Enter commits, Esc cancels).
- **Right-click context menus** (one positioned-popover component): canvas → *Add node here / Untangle / Fit view*; node → *Rename / Duplicate / Delete*; edge → *Reverse direction / Delete*. Duplicate creates a full copy of the node (fields included, new ids) placed +24px right/down from the original.
- **Multi-select:** React Flow selection box (drag on empty canvas with Shift); Delete/Backspace removes the whole selection.
- **Untangle:** d3-force simulation (link + many-body + center) run for ~1s with animated position updates, final positions written to the doc in one transaction. Also exposed in toolbar.
- Existing shortcuts stay (N, /, Delete, E reserved); `?` opens the cheat-sheet overlay.

## Home & chrome

- **Card grid** instead of rows: title, template badge, node/edge counts, color-dot cluster. Counts/palette come from a `preview` blob cached in the registry entry, refreshed whenever a graph screen closes (no doc-opening on Home).
- **Card actions:** rename (inline), delete with confirm — delete removes the registry entry AND the IndexedDB database (`clearDocument` / `indexedDB.deleteDatabase('connections-<id>')`).
- **Empty states:** Home with no graphs → friendly prompt into the template modal; fresh graph → centered hint "double-click anywhere to add your first node" that disappears after the first node.
- **Cheat-sheet overlay** on `?`: shortcuts + mouse gestures.

## Error handling

- Unknown/invalid shape, size, style, or dir values (e.g. hand-edited imports) resolve to defaults at render time — never crash.
- Context menu and inline rename close on Esc/outside click; rename of a node deleted mid-edit (future multiplayer) just closes.
- Untangle on an empty/1-node graph is a no-op; the simulation is capped (iterations + bounds) so it can't fling nodes to infinity.
- Registry preview blob is best-effort: missing/corrupt preview renders a plain card, never blocks Home.

## Testing

- **Unit:** style resolution (defaults ← type ← override), effective-types merge incl. id collision, fields CRUD through `doc.ts`, v1+v2 import acceptance and lenient-prop handling, registry preview read/write, duplicate-node logic.
- **Component:** fields editor (add/edit/secret mask/Show), shape & size pickers writing through doc.ts, context menu actions, inline rename commit/cancel, cheat-sheet toggle.
- **Smoke (extend `sketchbook/smoke.js`):** double-click creates node → rename inline → add field → mark secret → untangle runs → dark-mode toggle flips theme → delete graph from Home removes card.
- New dependency: `d3-force` only.

## Out of scope (unchanged from phase plan)

Crypto/E2EE, accounts, sync/multiplayer, invites — phases 2-5. Typed field schemas (option C) — possible later layer. Mobile, themes-as-marketplace, image/file attachments on nodes.

## Build order (suggested for the plan)

1. Types + style-resolution + effective-types (pure logic, tested)
2. doc.ts field/style mutations + io v2
3. Custom node renderer (shapes/sizes/states) + custom edge renderer
4. Node panel v2 + edge panel v2 (fields editor, pickers)
5. Interactions: dblclick create/rename, context menus, multi-select delete
6. Untangle (d3-force)
7. Dark mode toggle + minimap + canvas chrome
8. Home cards + registry preview + delete/rename + empty states + cheat sheet
9. Smoke test extension + polish pass
