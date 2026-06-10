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
