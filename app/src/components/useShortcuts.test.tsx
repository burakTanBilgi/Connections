import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useShortcuts } from './useShortcuts'

describe('useShortcuts', () => {
  it('fires the right handlers for n, e, /, Delete', () => {
    const h = { onNewNode: vi.fn(), onConnectMode: vi.fn(), onSearch: vi.fn(), onDelete: vi.fn() }
    renderHook(() => useShortcuts(h))
    fireEvent.keyDown(window, { key: 'n' })
    fireEvent.keyDown(window, { key: 'e' })
    fireEvent.keyDown(window, { key: '/' })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(h.onNewNode).toHaveBeenCalledOnce()
    expect(h.onConnectMode).toHaveBeenCalledOnce()
    expect(h.onSearch).toHaveBeenCalledOnce()
    expect(h.onDelete).toHaveBeenCalledOnce()
  })

  it('ignores shortcuts when modifier keys are held', () => {
    const h = { onNewNode: vi.fn(), onConnectMode: vi.fn(), onSearch: vi.fn(), onDelete: vi.fn() }
    renderHook(() => useShortcuts(h))
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'n', metaKey: true })
    fireEvent.keyDown(window, { key: 'n', altKey: true })
    expect(h.onNewNode).not.toHaveBeenCalled()
  })

  it('ignores keys while typing in an input', () => {
    const h = { onNewNode: vi.fn(), onConnectMode: vi.fn(), onSearch: vi.fn(), onDelete: vi.fn() }
    renderHook(() => useShortcuts(h))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'n' })
    expect(h.onNewNode).not.toHaveBeenCalled()
  })
})
