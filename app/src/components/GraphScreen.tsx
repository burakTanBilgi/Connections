import { useEffect, useMemo, useRef, useState } from 'react'
import { useReactFlow, ReactFlowProvider } from '@xyflow/react'
import { openGraphDoc, type OpenGraph } from '../graph/store'
import { addNode, initGraphDoc, getMeta } from '../graph/doc'
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

export function GraphScreen({ graphId, title, template, onBack }: { graphId: string; title: string; template: string; onBack: () => void }) {
  const [open, setOpen] = useState<OpenGraph | null>(null)

  useEffect(() => {
    const o = openGraphDoc(graphId)
    let active = true
    o.ready.then(() => {
      if (!getMeta(o.doc).title) initGraphDoc(o.doc, { title, template, theme: 'light' })
      if (active) setOpen(o)
    })
    return () => { active = false; o.close() }
  }, [graphId, title, template])

  if (!open) return <div className="loading">Opening graph…</div>
  return (
    <ReactFlowProvider>
      <GraphScreenInner open={open} title={title} onBack={onBack} />
    </ReactFlowProvider>
  )
}
