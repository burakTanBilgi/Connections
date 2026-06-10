# Phase 1: Local-Only Graph Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working local-first graph editor: create graphs from templates (blank / friend web / account map), edit nodes and edges on a React Flow canvas with a node side panel and keyboard shortcuts, persist locally via Yjs + IndexedDB, import/export JSON.

**Architecture:** One Yjs doc per graph is the single source of truth (`nodes`/`edges`/`meta` maps), persisted by y-indexeddb. React reads it through a subscription hook; all mutations go through `graph/doc.ts` functions so later phases can encrypt the same update stream. UI is three screens: Home (graph list + template modal), Canvas (React Flow + toolbar + node panel), and that's it — no server in this phase.

**Tech Stack:** Vite + React 18 + TypeScript, @xyflow/react (React Flow v12), yjs, y-indexeddb, vitest + @testing-library/react + jsdom + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-06-10-connections-design.md` (this plan = build-order phase 1). Later plans cover crypto, accounts/API, relay/multiplayer, invites/revocation, polish.

---

### Task 1: Scaffold the app workspace

**Files:**
- Create: `app/` (Vite scaffold), `app/vitest.config.ts`, `app/src/test-setup.ts`

- [ ] **Step 1: Scaffold Vite + React + TS into `app/`**

```bash
cd /home/butan/Desktop/Projects/Connections
npm create vite@latest app -- --template react-ts
cd app && npm install
npm install yjs y-indexeddb @xyflow/react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb
```

- [ ] **Step 2: Configure vitest**

Create `app/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

Create `app/src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

Add to `app/package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 3: Verify the scaffold runs**

Run: `cd app && npm run build && npm test`
Expected: build succeeds; vitest reports "no test files found" (exit code 1 is fine at this point — confirm the message, then move on).

- [ ] **Step 4: Commit**

```bash
git add app .gitignore
git commit -m "feat: scaffold Vite React TS app with vitest"
```

(Ensure root `.gitignore` contains `node_modules/` — it does, from the sketchbook commit. Add `app/dist/` to it.)

---

### Task 2: Types + template presets

**Files:**
- Create: `app/src/types.ts`, `app/src/graph/templates.ts`
- Test: `app/src/graph/templates.test.ts`

- [ ] **Step 1: Write the failing test**

`app/src/graph/templates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TEMPLATES, getTemplate } from './templates'

describe('templates', () => {
  it('exposes exactly blank, friends, accounts', () => {
    expect(TEMPLATES.map(t => t.id).sort()).toEqual(['accounts', 'blank', 'friends'])
  })

  it('friends template has person node type and relationship edge types', () => {
    const t = getTemplate('friends')
    expect(t.nodeTypes.map(n => n.id)).toContain('person')
    const edgeIds = t.edgeTypes.map(e => e.id)
    for (const id of ['knows', 'family', 'partner', 'coworker']) expect(edgeIds).toContain(id)
  })

  it('accounts template has email/account/password nodes and uses/recovers edges', () => {
    const t = getTemplate('accounts')
    expect(t.nodeTypes.map(n => n.id).sort()).toEqual(['account', 'email', 'password'])
    expect(t.edgeTypes.map(e => e.id).sort()).toEqual(['recovers', 'uses'])
  })

  it('every node type has a color; unknown template throws', () => {
    for (const t of TEMPLATES) for (const n of t.nodeTypes) expect(n.color).toMatch(/^#/)
    expect(() => getTemplate('nope')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/templates.test.ts`
Expected: FAIL — cannot resolve `./templates`.

- [ ] **Step 3: Implement types and templates**

`app/src/types.ts`:

```ts
export interface NodeData {
  label: string
  type: string        // node type id from the graph's template
  x: number
  y: number
  color: string       // hex
  notes: string
  secret?: string     // hidden-by-default field (UI gates display)
}

export interface EdgeData {
  from: string        // node id
  to: string          // node id
  type: string        // edge type id from the template
  label: string
}

export interface GraphMeta {
  title: string
  template: string    // template id
  theme: 'light' | 'dark'
}

export interface NodeTypeDef { id: string; label: string; color: string }
export interface EdgeTypeDef { id: string; label: string }

export interface Template {
  id: string
  name: string
  description: string
  nodeTypes: NodeTypeDef[]
  edgeTypes: EdgeTypeDef[]
}
```

`app/src/graph/templates.ts`:

```ts
import type { Template } from '../types'

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'An empty canvas. Define your own meaning.',
    nodeTypes: [{ id: 'node', label: 'Node', color: '#a5d8ff' }],
    edgeTypes: [{ id: 'link', label: 'Link' }],
  },
  {
    id: 'friends',
    name: 'Friend web',
    description: 'Map the people you know and how they connect.',
    nodeTypes: [{ id: 'person', label: 'Person', color: '#a5d8ff' }],
    edgeTypes: [
      { id: 'knows', label: 'Knows' },
      { id: 'family', label: 'Family' },
      { id: 'partner', label: 'Partner' },
      { id: 'coworker', label: 'Coworker' },
    ],
  },
  {
    id: 'accounts',
    name: 'Account map',
    description: 'Map accounts, emails and passwords — see reuse instantly.',
    nodeTypes: [
      { id: 'email', label: 'Email', color: '#b2f2bb' },
      { id: 'account', label: 'Account', color: '#a5d8ff' },
      { id: 'password', label: 'Password', color: '#ffc9c9' },
    ],
    edgeTypes: [
      { id: 'uses', label: 'Uses' },
      { id: 'recovers', label: 'Recovers' },
    ],
  },
]

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find(t => t.id === id)
  if (!t) throw new Error(`Unknown template: ${id}`)
  return t
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/graph/templates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/types.ts app/src/graph/templates.ts app/src/graph/templates.test.ts
git commit -m "feat: graph types and template presets"
```

---

### Task 3: Yjs graph document + CRUD operations

**Files:**
- Create: `app/src/graph/doc.ts`
- Test: `app/src/graph/doc.test.ts`

All mutations in the whole app go through these functions — phase 4 will encrypt this doc's update stream, so nothing else may touch the Y.Doc directly.

- [ ] **Step 1: Write the failing test**

`app/src/graph/doc.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  initGraphDoc, addNode, updateNode, removeNode,
  addEdge, updateEdge, removeEdge, getNodes, getEdges, getMeta, setMeta,
} from './doc'

function fresh() {
  const doc = new Y.Doc()
  initGraphDoc(doc, { title: 'test', template: 'friends', theme: 'light' })
  return doc
}

describe('graph doc', () => {
  it('initializes meta', () => {
    const doc = fresh()
    expect(getMeta(doc)).toEqual({ title: 'test', template: 'friends', theme: 'light' })
  })

  it('adds and reads a node', () => {
    const doc = fresh()
    const id = addNode(doc, { label: 'zoe', type: 'person', x: 10, y: 20, color: '#a5d8ff', notes: '' })
    const nodes = getNodes(doc)
    expect(nodes[id].label).toBe('zoe')
    expect(nodes[id].x).toBe(10)
  })

  it('updates a single field without clobbering others', () => {
    const doc = fresh()
    const id = addNode(doc, { label: 'zoe', type: 'person', x: 10, y: 20, color: '#a5d8ff', notes: '' })
    updateNode(doc, id, { x: 99 })
    expect(getNodes(doc)[id].label).toBe('zoe')
    expect(getNodes(doc)[id].x).toBe(99)
  })

  it('removing a node removes its edges too', () => {
    const doc = fresh()
    const a = addNode(doc, { label: 'a', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const e = addEdge(doc, { from: a, to: b, type: 'knows', label: '' })
    removeNode(doc, a)
    expect(getNodes(doc)[a]).toBeUndefined()
    expect(getEdges(doc)[e]).toBeUndefined()
  })

  it('edge CRUD works and setMeta merges', () => {
    const doc = fresh()
    const a = addNode(doc, { label: 'a', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const e = addEdge(doc, { from: a, to: b, type: 'knows', label: '' })
    updateEdge(doc, e, { label: 'best friends' })
    expect(getEdges(doc)[e].label).toBe('best friends')
    removeEdge(doc, e)
    expect(getEdges(doc)[e]).toBeUndefined()
    setMeta(doc, { theme: 'dark' })
    expect(getMeta(doc).title).toBe('test')
    expect(getMeta(doc).theme).toBe('dark')
  })

  it('two docs converge via update exchange (CRDT sanity)', () => {
    const d1 = fresh()
    const d2 = new Y.Doc()
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))
    addNode(d1, { label: 'from d1', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    addNode(d2, { label: 'from d2', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))
    Y.applyUpdate(d1, Y.encodeStateAsUpdate(d2))
    expect(Object.keys(getNodes(d1)).length).toBe(2)
    expect(getNodes(d1)).toEqual(getNodes(d2))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/doc.test.ts`
Expected: FAIL — cannot resolve `./doc`.

- [ ] **Step 3: Implement `doc.ts`**

`app/src/graph/doc.ts`:

```ts
import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'

// Layout: doc.getMap('nodes') : id -> Y.Map(node fields)
//         doc.getMap('edges') : id -> Y.Map(edge fields)
//         doc.getMap('meta')  : title/template/theme
// Per-field Y.Maps so concurrent edits to different fields merge cleanly.

const newId = () => crypto.randomUUID()

function toYMap(obj: Record<string, unknown>): Y.Map<unknown> {
  const m = new Y.Map()
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) m.set(k, v)
  return m
}

export function initGraphDoc(doc: Y.Doc, meta: GraphMeta): void {
  doc.transact(() => {
    const m = doc.getMap('meta')
    for (const [k, v] of Object.entries(meta)) m.set(k, v)
  })
}

export function addNode(doc: Y.Doc, node: NodeData): string {
  const id = newId()
  doc.transact(() => doc.getMap('nodes').set(id, toYMap({ ...node })))
  return id
}

export function updateNode(doc: Y.Doc, id: string, patch: Partial<NodeData>): void {
  doc.transact(() => {
    const n = doc.getMap('nodes').get(id) as Y.Map<unknown> | undefined
    if (!n) return
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) n.set(k, v)
  })
}

export function removeNode(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    doc.getMap('nodes').delete(id)
    const edges = doc.getMap('edges')
    for (const [eid, e] of edges.entries()) {
      const em = e as Y.Map<unknown>
      if (em.get('from') === id || em.get('to') === id) edges.delete(eid)
    }
  })
}

export function addEdge(doc: Y.Doc, edge: EdgeData): string {
  const id = newId()
  doc.transact(() => doc.getMap('edges').set(id, toYMap({ ...edge })))
  return id
}

export function updateEdge(doc: Y.Doc, id: string, patch: Partial<EdgeData>): void {
  doc.transact(() => {
    const e = doc.getMap('edges').get(id) as Y.Map<unknown> | undefined
    if (!e) return
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) e.set(k, v)
  })
}

export function removeEdge(doc: Y.Doc, id: string): void {
  doc.transact(() => doc.getMap('edges').delete(id))
}

export function getNodes(doc: Y.Doc): Record<string, NodeData> {
  return doc.getMap('nodes').toJSON() as Record<string, NodeData>
}

export function getEdges(doc: Y.Doc): Record<string, EdgeData> {
  return doc.getMap('edges').toJSON() as Record<string, EdgeData>
}

export function getMeta(doc: Y.Doc): GraphMeta {
  return doc.getMap('meta').toJSON() as GraphMeta
}

export function setMeta(doc: Y.Doc, patch: Partial<GraphMeta>): void {
  doc.transact(() => {
    const m = doc.getMap('meta')
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) m.set(k, v)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/graph/doc.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/graph/doc.ts app/src/graph/doc.test.ts
git commit -m "feat: Yjs graph document with CRUD operations"
```

---

### Task 4: JSON import/export

**Files:**
- Create: `app/src/graph/io.ts`
- Test: `app/src/graph/io.test.ts`

- [ ] **Step 1: Write the failing test**

`app/src/graph/io.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { initGraphDoc, addNode, addEdge, getNodes, getEdges, getMeta } from './doc'
import { exportGraph, importGraph } from './io'

describe('graph io', () => {
  it('round-trips a graph through JSON', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 'web', template: 'friends', theme: 'light' })
    const a = addNode(doc, { label: 'a', type: 'person', x: 1, y: 2, color: '#fff', notes: 'hi', secret: 's3cret' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 3, y: 4, color: '#fff', notes: '' })
    addEdge(doc, { from: a, to: b, type: 'knows', label: 'pals' })

    const json = exportGraph(doc)
    const doc2 = new Y.Doc()
    importGraph(doc2, json)

    expect(getMeta(doc2)).toEqual(getMeta(doc))
    expect(getNodes(doc2)).toEqual(getNodes(doc))
    expect(getEdges(doc2)).toEqual(getEdges(doc))
  })

  it('rejects malformed payloads', () => {
    const doc = new Y.Doc()
    expect(() => importGraph(doc, '{"not":"a graph"}')).toThrow(/invalid/i)
    expect(() => importGraph(doc, 'not json at all')).toThrow()
    expect(() => importGraph(doc, JSON.stringify({ version: 99, meta: {}, nodes: {}, edges: {} }))).toThrow(/version/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/io.test.ts`
Expected: FAIL — cannot resolve `./io`.

- [ ] **Step 3: Implement `io.ts`**

`app/src/graph/io.ts`:

```ts
import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'
import { initGraphDoc, addNodeWithId, addEdgeWithId, getNodes, getEdges, getMeta } from './doc'

export interface GraphExport {
  version: 1
  meta: GraphMeta
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
}

export function exportGraph(doc: Y.Doc): string {
  const payload: GraphExport = {
    version: 1,
    meta: getMeta(doc),
    nodes: getNodes(doc),
    edges: getEdges(doc),
  }
  return JSON.stringify(payload, null, 2)
}

export function importGraph(doc: Y.Doc, json: string): void {
  const data = JSON.parse(json) as Partial<GraphExport>
  if (data.version !== 1) throw new Error(`Unsupported version: ${data.version}`)
  if (!data.meta || typeof data.nodes !== 'object' || typeof data.edges !== 'object' || !data.nodes || !data.edges) {
    throw new Error('Invalid graph file')
  }
  initGraphDoc(doc, data.meta as GraphMeta)
  doc.transact(() => {
    for (const [id, n] of Object.entries(data.nodes!)) addNodeWithId(doc, id, n)
    for (const [id, e] of Object.entries(data.edges!)) addEdgeWithId(doc, id, e)
  })
}
```

Also add to `app/src/graph/doc.ts` (exported, used by import so ids survive round-trips):

```ts
export function addNodeWithId(doc: Y.Doc, id: string, node: NodeData): void {
  doc.transact(() => doc.getMap('nodes').set(id, toYMap({ ...node })))
}

export function addEdgeWithId(doc: Y.Doc, id: string, edge: EdgeData): void {
  doc.transact(() => doc.getMap('edges').set(id, toYMap({ ...edge })))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/graph`
Expected: PASS (templates + doc + io, 12 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/graph/io.ts app/src/graph/io.test.ts app/src/graph/doc.ts
git commit -m "feat: JSON import/export with validation"
```

---

### Task 5: Local graph registry + persistence wiring

**Files:**
- Create: `app/src/graph/registry.ts`
- Test: `app/src/graph/registry.test.ts`

The registry is the Home screen's data: which graphs exist locally. Stored in `localStorage` (graph content itself lives in IndexedDB via y-indexeddb, keyed `connections-<id>`).

- [ ] **Step 1: Write the failing test**

`app/src/graph/registry.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { listGraphs, createGraph, renameGraph, deleteGraphEntry } from './registry'

describe('registry', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty and registers created graphs', () => {
    expect(listGraphs()).toEqual([])
    const entry = createGraph('my web', 'friends')
    expect(entry.id).toBeTruthy()
    expect(listGraphs()).toEqual([{ id: entry.id, title: 'my web', template: 'friends' }])
  })

  it('renames and deletes entries', () => {
    const e = createGraph('a', 'blank')
    renameGraph(e.id, 'b')
    expect(listGraphs()[0].title).toBe('b')
    deleteGraphEntry(e.id)
    expect(listGraphs()).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/registry.test.ts`
Expected: FAIL — cannot resolve `./registry`.

- [ ] **Step 3: Implement `registry.ts`**

`app/src/graph/registry.ts`:

```ts
export interface GraphEntry { id: string; title: string; template: string }

const KEY = 'connections.graphs'

function read(): GraphEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function write(entries: GraphEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function listGraphs(): GraphEntry[] {
  return read()
}

export function createGraph(title: string, template: string): GraphEntry {
  const entry: GraphEntry = { id: crypto.randomUUID(), title, template }
  write([...read(), entry])
  return entry
}

export function renameGraph(id: string, title: string): void {
  write(read().map(e => (e.id === id ? { ...e, title } : e)))
}

export function deleteGraphEntry(id: string): void {
  write(read().filter(e => e.id !== id))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/graph/registry.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/graph/registry.ts app/src/graph/registry.test.ts
git commit -m "feat: local graph registry"
```

---

### Task 6: useGraph hook (Yjs → React)

**Files:**
- Create: `app/src/graph/useGraph.ts`
- Test: `app/src/graph/useGraph.test.tsx`

- [ ] **Step 1: Write the failing test**

`app/src/graph/useGraph.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as Y from 'yjs'
import { initGraphDoc, addNode } from './doc'
import { useGraph } from './useGraph'

describe('useGraph', () => {
  it('reflects doc state and re-renders on changes', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 't', template: 'blank', theme: 'light' })
    const { result } = renderHook(() => useGraph(doc))
    expect(Object.keys(result.current.nodes)).toHaveLength(0)

    let id = ''
    act(() => {
      id = addNode(doc, { label: 'n1', type: 'node', x: 5, y: 6, color: '#abc', notes: '' })
    })
    expect(result.current.nodes[id].label).toBe('n1')
    expect(result.current.meta.title).toBe('t')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/useGraph.test.tsx`
Expected: FAIL — cannot resolve `./useGraph`.

- [ ] **Step 3: Implement the hook**

`app/src/graph/useGraph.ts`:

```ts
import { useSyncExternalStore, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'
import { getNodes, getEdges, getMeta } from './doc'

export interface GraphState {
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
  meta: GraphMeta
}

export function useGraph(doc: Y.Doc): GraphState {
  const cache = useRef<GraphState | null>(null)
  const version = useRef(0)
  const lastVersion = useRef(-1)

  const subscribe = useCallback((onChange: () => void) => {
    const handler = () => { version.current++; onChange() }
    doc.on('update', handler)
    return () => doc.off('update', handler)
  }, [doc])

  const getSnapshot = useCallback((): GraphState => {
    if (lastVersion.current !== version.current || cache.current === null) {
      cache.current = { nodes: getNodes(doc), edges: getEdges(doc), meta: getMeta(doc) }
      lastVersion.current = version.current
    }
    return cache.current
  }, [doc])

  return useSyncExternalStore(subscribe, getSnapshot)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/graph/useGraph.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/graph/useGraph.ts app/src/graph/useGraph.test.tsx
git commit -m "feat: useGraph React hook over Yjs doc"
```

---

### Task 7: Doc lifecycle — open/persist graphs by id

**Files:**
- Create: `app/src/graph/store.ts`
- Test: `app/src/graph/store.test.ts`

- [ ] **Step 1: Write the failing test**

`app/src/graph/store.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { openGraphDoc } from './store'
import { addNode, getNodes } from './doc'

describe('store', () => {
  it('persists a graph to IndexedDB and reloads it', async () => {
    const { doc, ready, close } = openGraphDoc('test-graph-1')
    await ready
    const id = addNode(doc, { label: 'persisted', type: 'node', x: 0, y: 0, color: '#fff', notes: '' })
    // y-indexeddb writes debounced; storeState forces a flush via close()
    await close()

    const second = openGraphDoc('test-graph-1')
    await second.ready
    expect(getNodes(second.doc)[id]?.label).toBe('persisted')
    await second.close()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/graph/store.test.ts`
Expected: FAIL — cannot resolve `./store`.

- [ ] **Step 3: Implement `store.ts`**

`app/src/graph/store.ts`:

```ts
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface OpenGraph {
  doc: Y.Doc
  ready: Promise<void>
  close: () => Promise<void>
}

// One IndexedDB database per graph: "connections-<graphId>"
export function openGraphDoc(graphId: string): OpenGraph {
  const doc = new Y.Doc()
  const persistence = new IndexeddbPersistence(`connections-${graphId}`, doc)
  const ready = new Promise<void>(resolve => persistence.once('synced', () => resolve()))
  const close = async () => {
    await ready
    await persistence.destroy() // flushes pending writes, closes the db connection
    doc.destroy()
  }
  return { doc, ready, close }
}
```

Implementer note: `persistence.destroy()` stops the binding without clearing data (deleting data is `clearDocument()` — don't call that). If the reload assertion is flaky under fake-indexeddb because of y-indexeddb's debounced writes, add `await new Promise(r => setTimeout(r, 150))` before `close()` **in the test only**, with a comment explaining why.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/graph/store.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/graph/store.ts app/src/graph/store.test.ts
git commit -m "feat: graph persistence via y-indexeddb"
```

---

### Task 8: Canvas screen — React Flow wiring

**Files:**
- Create: `app/src/components/GraphCanvas.tsx`
- Test: `app/src/components/GraphCanvas.test.tsx`

React Flow needs DOM measurement that jsdom lacks, so the component test covers mounting + data mapping (nodes appear with labels), not drag interactions. Visual behavior is verified manually in Task 12.

- [ ] **Step 1: Write the failing test**

`app/src/components/GraphCanvas.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as Y from 'yjs'
import { initGraphDoc, addNode } from '../graph/doc'
import { GraphCanvas } from './GraphCanvas'

// React Flow needs ResizeObserver + DOMMatrixReadOnly; stub them for jsdom.
beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any
})

describe('GraphCanvas', () => {
  it('renders nodes from the doc', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 't', template: 'friends', theme: 'light' })
    addNode(doc, { label: 'zoe', type: 'person', x: 100, y: 100, color: '#a5d8ff', notes: '' })
    render(<GraphCanvas doc={doc} onSelectNode={vi.fn()} selectedNodeId={null} matchIds={null} />)
    expect(screen.getByText('zoe')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/GraphCanvas.test.tsx`
Expected: FAIL — cannot resolve `./GraphCanvas`.

- [ ] **Step 3: Implement `GraphCanvas.tsx`**

`app/src/components/GraphCanvas.tsx`:

```tsx
import { useCallback, useMemo } from 'react'
import * as Y from 'yjs'
import {
  ReactFlow, Background, Controls, type Node, type Edge,
  type NodeChange, type EdgeChange, type Connection, applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useGraph } from '../graph/useGraph'
import { updateNode, removeNode, removeEdge, addEdge as addDocEdge } from '../graph/doc'
import { getTemplate } from '../graph/templates'

interface Props {
  doc: Y.Doc
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  matchIds: Set<string> | null   // search results; null = not searching
}

export function GraphCanvas({ doc, selectedNodeId, onSelectNode, matchIds }: Props) {
  const { nodes, edges, meta } = useGraph(doc)

  const rfNodes: Node[] = useMemo(() =>
    Object.entries(nodes).map(([id, n]) => ({
      id,
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      selected: id === selectedNodeId,
      style: {
        background: n.color,
        borderRadius: 16,
        border: id === selectedNodeId ? '2px solid #4a9eed' : '1px solid #00000022',
        padding: 8,
        opacity: matchIds && !matchIds.has(id) ? 0.25 : 1,
      },
    })), [nodes, selectedNodeId, matchIds])

  const rfEdges: Edge[] = useMemo(() =>
    Object.entries(edges).map(([id, e]) => ({
      id, source: e.from, target: e.to, label: e.label || undefined,
    })), [edges])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === 'position' && c.position && !Number.isNaN(c.position.x)) {
        updateNode(doc, c.id, { x: c.position.x, y: c.position.y })
      } else if (c.type === 'remove') {
        removeNode(doc, c.id)
      } else if (c.type === 'select') {
        onSelectNode(c.selected ? c.id : null)
      }
    }
  }, [doc, onSelectNode])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) if (c.type === 'remove') removeEdge(doc, c.id)
  }, [doc])

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    const defaultEdgeType = getTemplate(meta.template).edgeTypes[0].id
    addDocEdge(doc, { from: conn.source, to: conn.target, type: defaultEdgeType, label: '' })
  }, [doc, meta.template])

  return (
    <div style={{ width: '100%', height: '100%' }} data-testid="graph-canvas">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => onSelectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/GraphCanvas.test.tsx`
Expected: PASS (1 test). If React Flow throws on a missing browser API in jsdom, stub it in `test-setup.ts` (e.g. `window.DOMMatrixReadOnly`), not in the component.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GraphCanvas.tsx app/src/components/GraphCanvas.test.tsx app/src/test-setup.ts
git commit -m "feat: React Flow canvas bound to Yjs doc"
```

---

### Task 9: Node panel (right side)

**Files:**
- Create: `app/src/components/NodePanel.tsx`
- Test: `app/src/components/NodePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

`app/src/components/NodePanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Y from 'yjs'
import { initGraphDoc, addNode, getNodes } from '../graph/doc'
import { NodePanel } from './NodePanel'

function setup(secret?: string) {
  const doc = new Y.Doc()
  initGraphDoc(doc, { title: 't', template: 'accounts', theme: 'light' })
  const id = addNode(doc, { label: 'gmail', type: 'email', x: 0, y: 0, color: '#b2f2bb', notes: '', secret })
  return { doc, id }
}

describe('NodePanel', () => {
  it('edits the label through the doc', async () => {
    const { doc, id } = setup()
    render(<NodePanel doc={doc} nodeId={id} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/label/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'proton')
    expect(getNodes(doc)[id].label).toBe('proton')
  })

  it('hides the secret until Show is clicked', async () => {
    const { doc, id } = setup('hunter2')
    render(<NodePanel doc={doc} nodeId={id} onClose={vi.fn()} />)
    expect(screen.queryByDisplayValue('hunter2')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /show/i }))
    expect(screen.getByDisplayValue('hunter2')).toBeInTheDocument()
  })

  it('offers the template node types in the type select', () => {
    const { doc, id } = setup()
    render(<NodePanel doc={doc} nodeId={id} onClose={vi.fn()} />)
    const select = screen.getByLabelText(/type/i) as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values.sort()).toEqual(['account', 'email', 'password'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/NodePanel.test.tsx`
Expected: FAIL — cannot resolve `./NodePanel`.

- [ ] **Step 3: Implement `NodePanel.tsx`**

`app/src/components/NodePanel.tsx`:

```tsx
import { useState } from 'react'
import * as Y from 'yjs'
import { useGraph } from '../graph/useGraph'
import { updateNode, removeNode } from '../graph/doc'
import { getTemplate } from '../graph/templates'

interface Props { doc: Y.Doc; nodeId: string; onClose: () => void }

export function NodePanel({ doc, nodeId, onClose }: Props) {
  const { nodes, meta } = useGraph(doc)
  const [showSecret, setShowSecret] = useState(false)
  const node = nodes[nodeId]
  if (!node) return null
  const template = getTemplate(meta.template)

  const set = (patch: Parameters<typeof updateNode>[2]) => updateNode(doc, nodeId, patch)

  return (
    <aside className="node-panel">
      <div className="node-panel-header">
        <strong>Node</strong>
        <button onClick={onClose} aria-label="Close panel">×</button>
      </div>

      <label>Label
        <input value={node.label} onChange={e => set({ label: e.target.value })} />
      </label>

      <label>Type
        <select
          value={node.type}
          onChange={e => {
            const t = template.nodeTypes.find(n => n.id === e.target.value)
            set({ type: e.target.value, color: t?.color ?? node.color })
          }}
        >
          {template.nodeTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>

      <label>Color
        <input type="color" value={node.color} onChange={e => set({ color: e.target.value })} />
      </label>

      <label>Notes
        <textarea value={node.notes} onChange={e => set({ notes: e.target.value })} rows={4} />
      </label>

      <div className="secret-row">
        <span>Secret</span>
        {showSecret ? (
          <>
            <input value={node.secret ?? ''} onChange={e => set({ secret: e.target.value })} />
            <button onClick={() => setShowSecret(false)}>Hide</button>
          </>
        ) : (
          <button onClick={() => setShowSecret(true)}>Show</button>
        )}
      </div>

      <button className="danger" onClick={() => { removeNode(doc, nodeId); onClose() }}>
        Delete node
      </button>
    </aside>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/NodePanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/NodePanel.tsx app/src/components/NodePanel.test.tsx
git commit -m "feat: node side panel with hidden-by-default secret"
```

---

### Task 10: Home screen + template picker modal

**Files:**
- Create: `app/src/components/HomePage.tsx`, `app/src/components/TemplateModal.tsx`
- Test: `app/src/components/HomePage.test.tsx`

- [ ] **Step 1: Write the failing test**

`app/src/components/HomePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from './HomePage'
import { listGraphs } from '../graph/registry'

describe('HomePage', () => {
  beforeEach(() => localStorage.clear())

  it('opens the template modal from + new graph, creates a graph, navigates', async () => {
    const onOpen = vi.fn()
    render(<HomePage onOpenGraph={onOpen} />)
    expect(screen.queryByText(/pick a template/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /new graph/i }))
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /friend web/i }))
    await userEvent.type(screen.getByLabelText(/name/i), 'my people')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    const graphs = listGraphs()
    expect(graphs).toHaveLength(1)
    expect(graphs[0].title).toBe('my people')
    expect(graphs[0].template).toBe('friends')
    expect(onOpen).toHaveBeenCalledWith(graphs[0].id)
  })

  it('lists existing graphs and opens on click', async () => {
    const onOpen = vi.fn()
    localStorage.setItem('connections.graphs', JSON.stringify([{ id: 'g1', title: 'web', template: 'friends' }]))
    render(<HomePage onOpenGraph={onOpen} />)
    await userEvent.click(screen.getByText('web'))
    expect(onOpen).toHaveBeenCalledWith('g1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/HomePage.test.tsx`
Expected: FAIL — cannot resolve `./HomePage`.

- [ ] **Step 3: Implement `TemplateModal.tsx` and `HomePage.tsx`**

`app/src/components/TemplateModal.tsx`:

```tsx
import { useState } from 'react'
import { TEMPLATES } from '../graph/templates'

interface Props {
  onCreate: (title: string, templateId: string) => void
  onClose: () => void
}

export function TemplateModal({ onCreate, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Pick a template" onClick={e => e.stopPropagation()}>
        <h2>Pick a template</h2>
        <div className="template-cards">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`template-card ${selected === t.id ? 'selected' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <strong>{t.name}</strong>
              <p>{t.description}</p>
            </button>
          ))}
        </div>
        {selected && (
          <form onSubmit={e => { e.preventDefault(); if (title.trim()) onCreate(title.trim(), selected) }}>
            <label>Name
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="My graph" />
            </label>
            <button type="submit" disabled={!title.trim()}>Create</button>
          </form>
        )}
      </div>
    </div>
  )
}
```

`app/src/components/HomePage.tsx`:

```tsx
import { useState } from 'react'
import { listGraphs, createGraph } from '../graph/registry'
import { TemplateModal } from './TemplateModal'

interface Props { onOpenGraph: (id: string) => void }

export function HomePage({ onOpenGraph }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [graphs, setGraphs] = useState(listGraphs())

  const handleCreate = (title: string, templateId: string) => {
    const entry = createGraph(title, templateId)
    setGraphs(listGraphs())
    setModalOpen(false)
    onOpenGraph(entry.id)
  }

  return (
    <main className="home">
      <h1>Connections</h1>
      <ul className="graph-list">
        {graphs.map(g => (
          <li key={g.id}>
            <button className="graph-row" onClick={() => onOpenGraph(g.id)}>
              <span>{g.title}</span>
              <small>{g.template}</small>
            </button>
          </li>
        ))}
      </ul>
      <button className="new-graph" onClick={() => setModalOpen(true)}>+ New graph</button>
      {modalOpen && <TemplateModal onCreate={handleCreate} onClose={() => setModalOpen(false)} />}
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/HomePage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HomePage.tsx app/src/components/TemplateModal.tsx app/src/components/HomePage.test.tsx
git commit -m "feat: home screen with template picker modal"
```

---

### Task 11: Keyboard shortcuts + toolbar

**Files:**
- Create: `app/src/components/useShortcuts.ts`, `app/src/components/Toolbar.tsx`
- Test: `app/src/components/useShortcuts.test.tsx`

Shortcuts (spec): **N** new node, **E** connect-mode hint, **/** focus search, **Delete** remove selection. Connect itself is React Flow drag-from-handle; **E** with a node selected starts an edge from it to the next clicked node — implemented as "pending connect" state.

- [ ] **Step 1: Write the failing test**

`app/src/components/useShortcuts.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useShortcuts } from './useShortcuts'

describe('useShortcuts', () => {
  it('fires the right handlers for n, e, /, Delete', () => {
    const h = { onNewNode: vi.fn(), onConnectMode: vi.fn(), onSearch: vi.fn(), onDelete: vi.fn() }
    renderHook(() => useShortcuts(h))
    fireEvent.keyDown(window, { key: 'n' })
    fireEvent.keyDown(window, { key: 'e' })
    fireEvent.keyDown(window, { key: '/' })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(h.onNewNode).toHaveBeenCalledOnce()
    expect(h.onConnectMode).toHaveBeenCalledOnce()
    expect(h.onSearch).toHaveBeenCalledOnce()
    expect(h.onDelete).toHaveBeenCalledOnce()
  })

  it('ignores keys while typing in an input', () => {
    const h = { onNewNode: vi.fn(), onConnectMode: vi.fn(), onSearch: vi.fn(), onDelete: vi.fn() }
    renderHook(() => useShortcuts(h))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'n' })
    expect(h.onNewNode).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/components/useShortcuts.test.tsx`
Expected: FAIL — cannot resolve `./useShortcuts`.

- [ ] **Step 3: Implement hook + toolbar**

`app/src/components/useShortcuts.ts`:

```ts
import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNewNode: () => void
  onConnectMode: () => void
  onSearch: () => void
  onDelete: () => void
}

export function useShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target?.isContentEditable) return
      switch (e.key) {
        case 'n': case 'N': handlers.onNewNode(); break
        case 'e': case 'E': handlers.onConnectMode(); break
        case '/': e.preventDefault(); handlers.onSearch(); break
        case 'Delete': case 'Backspace': handlers.onDelete(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
```

`app/src/components/Toolbar.tsx`:

```tsx
interface Props {
  onNewNode: () => void
  onFitView: () => void
  onExport: () => void
  onImport: () => void
  search: string
  onSearchChange: (q: string) => void
}

export function Toolbar({ onNewNode, onFitView, onExport, onImport, search, onSearchChange }: Props) {
  return (
    <div className="toolbar">
      <button onClick={onNewNode} title="New node (N)">+ Node</button>
      <button onClick={onFitView} title="Fit view">Fit</button>
      <input
        id="graph-search"
        placeholder="Search… (/)"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      <span className="spacer" />
      <button onClick={onExport}>Export JSON</button>
      <button onClick={onImport}>Import JSON</button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/components/useShortcuts.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/useShortcuts.ts app/src/components/useShortcuts.test.tsx app/src/components/Toolbar.tsx
git commit -m "feat: keyboard shortcuts and toolbar"
```

---

### Task 12: App shell — wire everything together

**Files:**
- Modify: `app/src/App.tsx` (replace scaffold content), `app/src/main.tsx`, `app/src/index.css` (replace), delete `app/src/App.css`
- Create: `app/src/components/GraphScreen.tsx`

No new unit test (composition only — pieces are tested above); this task ends with a full manual smoke test and `npm test` green.

- [ ] **Step 1: Implement `GraphScreen.tsx`** (canvas + toolbar + panel + shortcuts + import/export + search):

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReactFlow, ReactFlowProvider } from '@xyflow/react'
import { openGraphDoc, type OpenGraph } from '../graph/store'
import { addNode } from '../graph/doc'
import { exportGraph, importGraph } from '../graph/io'
import { getTemplate } from '../graph/templates'
import { useGraph } from '../graph/useGraph'
import { GraphCanvas } from './GraphCanvas'
import { NodePanel } from './NodePanel'
import { Toolbar } from './Toolbar'
import { useShortcuts } from './useShortcuts'

function GraphScreenInner({ open, title, onBack }: { open: OpenGraph; title: string; onBack: () => void }) {
  const doc = open.doc
  const { meta, nodes } = useGraph(doc)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { fitView } = useReactFlow()
  const fileInput = useRef<HTMLInputElement>(null)

  const template = getTemplate(meta.template ?? 'blank')

  const newNode = () => {
    const t = template.nodeTypes[0]
    const id = addNode(doc, {
      label: 'new ' + t.label.toLowerCase(),
      type: t.id,
      x: 80 + Math.random() * 240,
      y: 80 + Math.random() * 240,
      color: t.color,
      notes: '',
    })
    setSelectedNodeId(id)
  }

  // Search: dim non-matching nodes by writing nothing — matching is presentation-only.
  const matchIds = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return new Set(Object.entries(nodes)
      .filter(([, n]) => n.label.toLowerCase().includes(q) || n.notes.toLowerCase().includes(q))
      .map(([id]) => id))
  }, [search, nodes])

  useShortcuts({
    onNewNode: newNode,
    onConnectMode: () => {}, // edges are drag-from-handle in phase 1; E reserved
    onSearch: () => document.getElementById('graph-search')?.focus(),
    onDelete: () => { /* React Flow handles Delete for selected elements */ },
  })

  const doExport = () => {
    const blob = new Blob([exportGraph(doc)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title || 'graph'}.connections.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file: File) => {
    try {
      importGraph(doc, await file.text())
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`)
    }
  }

  return (
    <div className="graph-screen" data-theme={meta.theme ?? 'light'}>
      <header className="graph-header">
        <button onClick={onBack}>← Home</button>
        <strong>{title}</strong>
        <span className="spacer" />
      </header>
      <Toolbar
        onNewNode={newNode}
        onFitView={() => fitView()}
        onExport={doExport}
        onImport={() => fileInput.current?.click()}
        search={search}
        onSearchChange={setSearch}
      />
      <input
        ref={fileInput} type="file" accept="application/json" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }}
      />
      <div className="canvas-wrap">
        <GraphCanvas doc={doc} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} matchIds={matchIds} />
        {selectedNodeId && (
          <NodePanel doc={doc} nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
        )}
      </div>
    </div>
  )
}

export function GraphScreen({ graphId, title, onBack }: { graphId: string; title: string; onBack: () => void }) {
  const [open, setOpen] = useState<OpenGraph | null>(null)

  useEffect(() => {
    const o = openGraphDoc(graphId)
    let active = true
    o.ready.then(() => { if (active) setOpen(o) })
    return () => { active = false; o.close() }
  }, [graphId])

  if (!open) return <div className="loading">Opening graph…</div>
  return (
    <ReactFlowProvider>
      <GraphScreenInner open={open} title={title} onBack={onBack} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 2: Replace `App.tsx`**

```tsx
import { useState } from 'react'
import { HomePage } from './components/HomePage'
import { GraphScreen } from './components/GraphScreen'
import { listGraphs } from './graph/registry'

export default function App() {
  const [openId, setOpenId] = useState<string | null>(null)
  if (openId) {
    const entry = listGraphs().find(g => g.id === openId)
    return (
      <GraphScreen
        graphId={openId}
        title={entry?.title ?? 'Untitled'}
        onBack={() => setOpenId(null)}
      />
    )
  }
  return <HomePage onOpenGraph={setOpenId} />
}
```

`main.tsx` keeps the Vite default (StrictMode + createRoot). Delete `App.css`; remove its import.

- [ ] **Step 3: Replace `index.css` with the soft minimal theme**

```css
:root {
  --bg: #fcfcfd; --fg: #1e1e2e; --muted: #757575;
  --panel: #ffffff; --border: #e7e7ec; --accent: #4a9eed;
  --radius: 14px;
}
[data-theme='dark'] {
  --bg: #16161e; --fg: #e5e5ee; --muted: #a0a0b0;
  --panel: #1e1e2a; --border: #2c2c3a; --accent: #6db3f5;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg); color: var(--fg);
  font-family: system-ui, -apple-system, sans-serif;
}
button {
  font: inherit; color: inherit; background: var(--panel);
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 8px 14px; cursor: pointer;
}
button:hover { border-color: var(--accent); }
input, textarea, select {
  font: inherit; color: inherit; background: var(--panel);
  border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px;
}
.home { max-width: 560px; margin: 8vh auto; padding: 0 20px; }
.home h1 { font-weight: 600; letter-spacing: -0.5px; }
.graph-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.graph-row { width: 100%; display: flex; justify-content: space-between; padding: 14px 18px; }
.graph-row small { color: var(--muted); }
.new-graph { margin-top: 16px; width: 100%; border-style: dashed; }
.modal-backdrop {
  position: fixed; inset: 0; background: #00000055;
  display: grid; place-items: center; z-index: 10;
}
.modal { background: var(--panel); border-radius: var(--radius); padding: 24px; width: min(640px, 92vw); }
.template-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
.template-card { text-align: left; padding: 14px; }
.template-card.selected { border-color: var(--accent); outline: 2px solid var(--accent); }
.template-card p { color: var(--muted); font-size: 13px; margin: 6px 0 0; }
.graph-screen { display: flex; flex-direction: column; height: 100%; }
.graph-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.toolbar { display: flex; gap: 8px; padding: 8px 14px; border-bottom: 1px solid var(--border); align-items: center; }
.spacer { flex: 1; }
.canvas-wrap { position: relative; flex: 1; min-height: 0; }
.node-panel {
  position: absolute; right: 12px; top: 12px; bottom: 12px; width: 260px;
  background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; z-index: 5;
}
.node-panel label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
.node-panel-header { display: flex; justify-content: space-between; align-items: center; }
.secret-row { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--muted); }
.danger { color: #ef4444; border-color: #ef444455; margin-top: auto; }
.loading { display: grid; place-items: center; height: 100%; color: var(--muted); }
```

- [ ] **Step 4: Full test suite + build**

Run: `cd app && npm test && npm run build`
Expected: all tests PASS; production build succeeds with no TS errors.

- [ ] **Step 5: Manual smoke test**

Run: `cd app && npm run dev` then open the printed URL. Verify:
1. Home shows "+ New graph"; clicking opens the template modal with three cards.
2. Create "test" from Friend web → canvas opens.
3. N adds a node; clicking it opens the panel; edit label/color/notes; secret hidden behind Show.
4. Drag from a node handle to another node → edge appears.
5. Reload the page, reopen the graph → everything persisted.
6. Export downloads JSON; Import round-trips it.

- [ ] **Step 6: Commit + push**

```bash
git add -A
git commit -m "feat: app shell wiring home, canvas, panel, import/export"
git push
```

---

## Plan-level acceptance criteria (phase 1 done when…)

- `npm test` green, `npm run build` clean.
- A user can: create a graph from each of the 3 templates via the modal, add/edit/delete nodes and edges, see soft-edged minimal styling, persist across reloads, export and re-import JSON, and use N / / / Delete shortcuts.
- All graph mutations flow through `graph/doc.ts` (grep check: no `getMap(` outside `app/src/graph/`).

## Deferred to later phases (per spec)

Crypto module (plan 2) · accounts + API (plan 3) · relay + live multiplayer + presence/cursors (plan 4) · invites/roles/revocation (plan 5) · dark-mode toggle UI, force layout, onboarding (plan 6 — note `data-theme` plumbing already exists).
