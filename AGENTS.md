# Agent instructions

## Project Overview

**Snae Player** is a privacy-first local music PWA that runs entirely in the browser — no data leaves the device. Built with **SvelteKit 5** (runes), **TypeScript** strict mode, and **Tailwind CSS 4**.

- **Client-only SPA** — `adapter-static` with `ssr = false` and `prerender = false` (`src/routes/+layout.ts`); nothing renders on a server
- Local playback via File System Access API (Files API fallback), metadata in IndexedDB, scanning in a Web Worker
- `.generated/` is build output (i18n runtime, auto-import types) — never hand-edit it
- Custom i18n Vite plugin (`lib/vite-i18n/`); messages live in `messages/*.json`
- See `package.json` for dependencies and their versions

## File Organization

```
src/
├── routes/            # (app) main app, (marketing) landing page, (assets) dynamic assets
├── lib/
│   ├── components/    # Reusable UI components
│   ├── audio/         # Web Audio playback engine (mediabunny, gapless, EQ)
│   ├── stores/        # Global state (main, player, dialogs)
│   ├── db/            # IndexedDB setup, change events, reactive queries
│   ├── library/       # Library operations (scanning, playlists, queries)
│   ├── helpers/       # Utility functions
│   └── attachments/   # Svelte element attachments (ripple, tooltip)
tests/                 # Vitest with fake-indexeddb; clearDatabaseStores in tests/shared.ts
```

## Design System & Styling

Use design tokens from `src/app.css` and `src/theme-colors.css` — **never arbitrary values**.

> **Critical**: Color token names use **camelCase**: `var(--color-onSurface)`, NOT `--color-on-surface`.

- Spacing via the Tailwind scale: `--spacing(4)`; typography via utility classes (`text-body-md`, `text-title-lg`, … — full scale in `src/app.css`), not `font-size`
- Prefer theme breakpoints in media queries: `@media (width >= --theme(--breakpoint-sm))`; in component `<style>` blocks add the appropriate `@reference` when using theme tokens
- All clickable elements need the `.interactable` class; use `{@attach ripple()}` for touch feedback and `{@attach tooltip('…')}` for tooltips (`$lib/attachments/`)

## Auto-Imported Utilities

Globally available without imports (configured in `vite.config.ts`). **Never import them manually.**

- `m.*()` — i18n messages (from the `i18n:messages` virtual module)
- `usePlayer()`, `useMainStore()`, `useDialogsStore()`, `useMenu()` — context stores, call inside the component tree
- `snackbar(...)` / `snackbar.unexpectedError(error)` / `snackbar.dismiss(id)` — toasts
- `invariant(condition, 'message')` — runtime assertions (tiny-invariant)
- `untrack(() => value)` — Svelte untrack

Note: `Snippet<T>` and `ClassValue` are Svelte/TypeScript built-in types, not auto-imports.

## Components

Browse `src/lib/components/` — names are self-describing. Non-obvious conventions:

- Render long lists with `VirtualContainer.svelte` or the entity `*ListContainer.svelte` wrappers — never a plain `{#each}` over the whole library.
- `TracksListContainer` takes a `source` prop (`TrackListSource`), resolved on demand so nothing materializes the list. Use `createTrackRowsSource` with `trackIdRows` / `playlistEntryRows` (`components/tracks/track-rows.svelte.ts`) for flat lists; only a sectioned list hand-builds a source — see `routes/(app)/player/queue-rows.svelte.ts`. The contracts (row identity, `size`/`keyAt` hot-path constraints, `hasEntry`) are documented on the types in `TracksListContainer.svelte` — read them before writing a source.
- Use `ListDetailsLayout.svelte` for master-detail views (library + player).

## State Management

Context-based stores built on runes, in `src/lib/stores/`: `MainStore` (settings, theme), `PlayerStore` (playback), `DialogsStore`. Read the store classes for their APIs.

The player/queue split worth knowing before touching playback:

- Everything that can **start audio** lives on `PlayerStore` (`play`, `playFrom`, `playQueueEntry`, …). `player.queue` is a `QueueView`: reads plus mutations that never start audio.
- The queue is **two-layer** (`src/lib/stores/player/`): a `manual` layer (explicit "play next" / "add to queue") always precedes a `source` layer (the album/playlist playback started from). Rows are addressed by session-scoped `entryId`, never by position — the same track can sit on several rows.

Stores self-persist via the `persist()` helper inside their constructors (localStorage, `snaeplayer-{store}.{key}`) — do not call it for new ad-hoc values.

## Database Layer

IndexedDB via `idb`, with change events (`$lib/db/events.ts`) driving reactive queries (`$lib/db/query/`). Entity interfaces and special constants (`FAVORITE_PLAYLIST_ID`, `UNKNOWN_ITEM` sentinel for unknown artist/album/year, `LEGACY_NO_NATIVE_DIRECTORY`) live in `$lib/library/types.ts` — read them there.

- **Every DB write must dispatch `dispatchDatabaseChangedEvent`** (`$lib/db/events.ts`) — it is what updates reactive queries, other tabs, and the player queue. Writing to `idb` without it silently leaves the UI stale.
- Route data: queries are created in `+page.ts` / `+layout.ts` loaders and the component must call `initPageQueries(() => data)` before reading their `.value`.

## Development Workflow

### Commands

```bash
pnpm run dev          # Start dev server
pnpm run build        # Production build
pnpm run i18n-check   # Validate translations in messages/*.json
pnpm run type-check   # Type checking
pnpm run biome-check  # Linting (biome-fix to auto-fix)
pnpm run oxfmt-check  # Formatting (oxfmt-fix to apply)
pnpm run knip         # Find unused files/exports/deps
pnpm run test         # Run tests
```

### Comments

Prefer self-documenting code — good names and structure over explanatory comments. When a comment is warranted:

- Only for non-obvious behavior: invariants, constraints, or "why", never restating what the code does
- Describe what the code *is*, not what changed — never narrate or justify a diff
- Keep it concise; longer doc blocks are fine at boundaries (public contracts, module seams, subtle protocols)

### Code Quality Rules

#### Always Do ✅

- **Ignore IDE/editor Biome diagnostics** — they are frequently stale due to the Biome language server caching. Always verify by running `pnpm run biome-check` in the terminal instead.
- Use pnpm when running commands
- Use design system tokens, never arbitrary values
- Use Svelte 5 runes for reactive state
- Type everything explicitly - avoid `any` types
- Handle loading and error states
- Include accessibility attributes
- Use `invariant()` for runtime checks
- Clear test mocks in `afterEach`
- Run `pnpm run i18n-check` after adding/changing i18n keys
- Keep i18n placeholders exactly aligned with English keys (`{count}`, `{name}`, etc.)

#### Never Do ❌

- Use arbitrary Tailwind classes for colors/spacing
- Import auto-imported utilities (m, usePlayer, useMainStore, etc.)
- Skip TypeScript strict mode checks
- Ignore accessibility requirements
- Add server-side dependencies except in `+server.ts` files
- Use `any` types except for complex generics
- Skip error handling
- Hardcode strings (use i18n messages)
- Remove console.info, console.warn, console.error. console.log is handled by biome lint rule.

### File Naming Conventions

- **Components**: `PascalCase.svelte`
- **Types**: `kebab-case.ts`
- **Stores**: `kebab-case.svelte.ts`

## Marketing Copy

For landing-page edits under `src/routes/(marketing)/`, follow the colocated guidance in `src/routes/(marketing)/AGENTS.md` and `src/routes/(marketing)/TONE_OF_VOICE.md`.
