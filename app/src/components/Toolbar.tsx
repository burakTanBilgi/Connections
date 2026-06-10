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
