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
