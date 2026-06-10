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
