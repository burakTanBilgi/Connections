# Connections — Design Spec

**Date:** 2026-06-10
**Status:** Approved by Burak (brainstorm 2026-06-10)

## What this is

Connections is a web app for visualising webs of relationships as an interactive node/edge graph. It is aesthetic, very simple, and collaborative: people join each other's graphs as named members to view or edit them, live. Every graph is end-to-end encrypted — the server can never read any graph.

Two starter templates showcase the engine:

1. **Friend web** — map the people you know and how they connect; invite those people and watch the web grow collaboratively.
2. **Account map** — map your accounts, emails, and passwords as a dependency graph (which email recovers what, which password is reused where). Relationship mapping plus an optional hidden secret field per node — not a full password manager.

## Prior art (why build it)

No maintained project combines all four pillars: (a) aesthetic + dead simple, (b) real graph semantics, (c) join-and-co-edit live collaboration, (d) E2EE. Closest: PRSM (live graph rooms; clunky, PolyForm NC license, no E2EE), Kumu/Graph Commons (closed SaaS), Kinopio (right vibe; links aren't data), Excalidraw (E2EE collab; no graph model). Personal-social-graph mapping and E2EE credential mapping have effectively zero maintained incumbents.

## Decisions made

| Question | Decision |
|---|---|
| MVP focus | Generic graph tool; friends + accounts as templates |
| Encryption scope | E2EE for everything; server stores only ciphertext |
| Collaboration | Accounts + named invites (no anonymous link-joins in MVP) |
| Liveness | Full live multiplayer: cursors, presence, sub-second updates |
| Aesthetic | Minimal and calm with soft edges (vibe "B"), plus a dark mode with glowy network energy ("a bit of C"); theme system post-MVP |
| Distribution | Hosted web app, source open on GitHub (auditability backs the E2EE claim) |
| Vault depth | Relationship map + optional E2EE secret note per node; no autofill/password-manager features |
| Build route | Assemble proven parts: React + React Flow (xyflow) + Yjs + WebCrypto |

## Architecture

Three components; two are deliberately boring.

**Browser client (React + Vite + TypeScript).** All plaintext and all keys live only here.
- *Canvas UI:* React Flow renders/edits nodes and edges; collaborator cursors and presence overlay.
- *Graph doc:* one Yjs document per graph — the source of truth, merged conflict-free by the CRDT. Persisted locally via y-indexeddb for offline tolerance.
- *Crypto layer:* a small isolated module (WebCrypto) that encrypts every outgoing Yjs update with the graph key and decrypts incoming ones.

**Sync relay (Node, WebSocket).** Authenticates the connection (membership check), then fans out and persists encrypted Yjs updates per graph. Stores and forwards bytes it cannot read. Periodic encrypted snapshot compaction (client-produced) keeps load times sane.

**Auth + membership API (Node, REST).** Accounts, public keys, per-graph membership with roles (owner / editor / viewer), wrapped graph keys, invites. Postgres stores all metadata plus the encrypted blobs/updates.

## Data model

One Yjs doc per graph:

- `nodes`: id → { label, type, x, y, color, notes, secret? } — `secret` is hidden behind a click in the UI
- `edges`: id → { from, to, type, label }
- `meta`: { title, template, theme }

Templates are presets of node/edge types + colors, nothing more:
- *Friend web:* person nodes; knows / family / partner / coworker edges
- *Account map:* email / account / password nodes; uses / recovers edges — a password node with many edges makes reuse visible at a glance

Server-side (Postgres): users (id, email, auth verifier, public key, encrypted private key, encrypted recovery data), graphs (id, owner), memberships (user, graph, role, wrapped graph key), invites, encrypted updates + snapshots.

## Crypto design

- **Account keypair** (X25519) generated client-side at signup. Private key encrypted with a key derived from the password via **Argon2id**; stored server-side so login works from any device (Bitwarden/Proton pattern). The server can store it but never use it.
- **Graph key**: one random **AES-256-GCM** key per graph, generated client-side at graph creation. Encrypts every Yjs update and snapshot.
- **Invite** = wrap the graph key to the invitee's public key (sealed box); server stores the wrapped key, invitee unwraps client-side on accept.
- **Revocation** = rotate: client generates a new graph key, re-encrypts a fresh snapshot, re-wraps for remaining members; relay stops serving the removed user. (They keep what they already saw — inherent to E2EE.)
- **Recovery**: a 12-word recovery phrase (shown once at signup) wraps a backup of the private key. Password + phrase both lost ⇒ data unrecoverable, stated plainly in the UI at signup.
- Auth to the API uses a password-derived verifier (separate derivation from the encryption key), so the password itself never reaches the server in a usable form.

## Product surface (MVP)

Three screens:

1. **Login / Signup** — email + password; recovery phrase shown once at signup.
2. **Home** — list of my graphs, pending invites with join button, "+ new graph" which opens a **template picker modal** (cards: Blank / Friend web / Account map).
3. **Canvas** — the app. Left toolbar (add node, connect, fit view, force layout). Top bar (title, member avatars + live cursors, Share button → invite by username with editor/viewer role). Right panel for selected node: label, type, color, notes, secret ([show] to reveal). 

Power-user features in MVP: keyboard-first editing (N node, E edge, / search, Del delete), JSON import/export of a whole graph, local (client-side, post-decryption) search, dark mode.

Explicitly **not** in MVP: theme system, public gallery/publishing, cross-graph merging, mobile apps, autofill/breach checks, anonymous share links.

## Error handling

- *Offline:* y-indexeddb queues edits; replay on reconnect; quiet "reconnecting…" indicator.
- *Conflicts:* not a user-visible concept (CRDT merges deterministically).
- *Tampered/corrupt updates:* AES-GCM auth tag failure ⇒ update rejected and logged locally, never applied.
- *Member removal:* key rotation as above.
- *Lost credentials:* recovery phrase; both lost ⇒ honest data-loss message.

## Testing

- **Crypto module:** known-answer vectors, round-trips, wrong-key and tampered-ciphertext rejection. Module kept small and isolated.
- **Sync:** integration tests — two headless clients through a real relay must converge; a revoked client must fail to decrypt post-rotation updates.
- **E2E (Playwright):** signup → create from template → invite second user → co-edit → reload → intact.
- **Privacy proof:** automated test scanning all server-persisted bytes for plaintext markers; SECURITY.md documents the exact scheme; client source is public.

## Build order (suggested phases for the plan)

1. Canvas editor, local-only (React Flow + Yjs + y-indexeddb, templates, node panel, keyboard, import/export)
2. Crypto module (standalone, fully tested before integration)
3. Accounts + API (signup/login, keypairs, recovery phrase)
4. Relay + live multiplayer (encrypted updates, presence, cursors)
5. Invites, roles, revocation/key rotation
6. Polish: dark mode, force layout, search, onboarding honesty screens

## Open questions (deferred, not blocking)

- Hosting target for relay (needs persistent WebSocket — Fly.io/Railway/VPS; Vercel fine for the static client)
- Snapshot compaction cadence and size limits per graph
- Whether the "webs interconnect across graphs" vision becomes linked nodes or merged views (post-MVP design of its own)
