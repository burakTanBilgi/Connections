import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomePage } from './HomePage'
import { listGraphs } from '../graph/registry'

describe('HomePage', () => {
  beforeEach(() => localStorage.clear())

  it('opens the template modal from + new graph, creates a graph, navigates', async () => {
    const onOpen = vi.fn()
    render(<HomePage onOpenGraph={onOpen} />)
    expect(screen.queryByText(/pick a template/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /new graph/i }))
    expect(screen.getByText(/pick a template/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /friend web/i }))
    await userEvent.type(screen.getByLabelText(/name/i), 'my people')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    const graphs = listGraphs()
    expect(graphs).toHaveLength(1)
    expect(graphs[0].title).toBe('my people')
    expect(graphs[0].template).toBe('friends')
    expect(onOpen).toHaveBeenCalledWith(graphs[0].id)
  })

  it('lists existing graphs and opens on click', async () => {
    const onOpen = vi.fn()
    localStorage.setItem('connections.graphs', JSON.stringify([{ id: 'g1', title: 'web', template: 'friends' }]))
    render(<HomePage onOpenGraph={onOpen} />)
    await userEvent.click(screen.getByText('web'))
    expect(onOpen).toHaveBeenCalledWith('g1')
  })
})
