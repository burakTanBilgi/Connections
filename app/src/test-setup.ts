import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// Node.js 25 exposes a native (non-functional) localStorage that shadows jsdom's.
// Polyfill with a simple in-memory implementation so tests can use localStorage.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const store: Record<string, string> = {}
  const impl = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: impl, writable: true })
}
