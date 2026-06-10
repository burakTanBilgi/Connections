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
