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
        template={entry?.template ?? 'blank'}
        onBack={() => setOpenId(null)}
      />
    )
  }
  return <HomePage onOpenGraph={setOpenId} />
}
