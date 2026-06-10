import type { Template } from '../types'

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'An empty canvas. Define your own meaning.',
    nodeTypes: [{ id: 'node', label: 'Node', color: '#a5d8ff' }],
    edgeTypes: [{ id: 'link', label: 'Link' }],
  },
  {
    id: 'friends',
    name: 'Friend web',
    description: 'Map the people you know and how they connect.',
    nodeTypes: [{ id: 'person', label: 'Person', color: '#a5d8ff' }],
    edgeTypes: [
      { id: 'knows', label: 'Knows' },
      { id: 'family', label: 'Family' },
      { id: 'partner', label: 'Partner' },
      { id: 'coworker', label: 'Coworker' },
    ],
  },
  {
    id: 'accounts',
    name: 'Account map',
    description: 'Map accounts, emails and passwords — see reuse instantly.',
    nodeTypes: [
      { id: 'email', label: 'Email', color: '#b2f2bb' },
      { id: 'account', label: 'Account', color: '#a5d8ff' },
      { id: 'password', label: 'Password', color: '#ffc9c9' },
    ],
    edgeTypes: [
      { id: 'uses', label: 'Uses' },
      { id: 'recovers', label: 'Recovers' },
    ],
  },
]

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find(t => t.id === id)
  if (!t) throw new Error(`Unknown template: ${id}`)
  return t
}
