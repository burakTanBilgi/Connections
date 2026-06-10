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
