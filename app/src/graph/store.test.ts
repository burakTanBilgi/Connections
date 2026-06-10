import { describe, it, expect } from 'vitest'
import { openGraphDoc } from './store'
import { addNode, getNodes } from './doc'

describe('store', () => {
  it('persists a graph to IndexedDB and reloads it', async () => {
    const { doc, ready, close } = openGraphDoc('test-graph-1')
    await ready
    const id = addNode(doc, { label: 'persisted', type: 'node', x: 0, y: 0, color: '#fff', notes: '' })
    // y-indexeddb debounces writes; wait briefly so data flushes before close
    await new Promise(r => setTimeout(r, 150))
    await close()

    const second = openGraphDoc('test-graph-1')
    await second.ready
    expect(getNodes(second.doc)[id]?.label).toBe('persisted')
    await second.close()
  })
})
