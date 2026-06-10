import { useEffect } from 'react'

export interface ShortcutHandlers {
  onNewNode: () => void
  onConnectMode: () => void
  onSearch: () => void
  onDelete: () => void
}

export function useShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target?.isContentEditable) return
      switch (e.key) {
        case 'n': case 'N': handlers.onNewNode(); break
        case 'e': case 'E': handlers.onConnectMode(); break
        case '/': e.preventDefault(); handlers.onSearch(); break
        case 'Delete': case 'Backspace': handlers.onDelete(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
