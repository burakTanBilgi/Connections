import { describe, it, expect } from 'vitest'
import { pickSelection } from './GraphCanvas'

describe('pickSelection', () => {
  it('prefers the positive selection when batch has both select=true and select=false', () => {
    const changes = [
      { type: 'select', id: 'A', selected: true },
      { type: 'select', id: 'B', selected: false },
    ]
    expect(pickSelection(changes, 'node')).toEqual({ kind: 'node', id: 'A' })
  })

  it('returns null when all select changes are negative (deselect)', () => {
    const changes = [
      { type: 'select', id: 'A', selected: false },
      { type: 'select', id: 'B', selected: false },
    ]
    expect(pickSelection(changes, 'edge')).toBeNull()
  })

  it('returns undefined when there are no select-type changes in the batch', () => {
    const changes = [
      { type: 'position', id: 'A' },
      { type: 'remove', id: 'B' },
    ]
    expect(pickSelection(changes, 'node')).toBeUndefined()
  })
})
