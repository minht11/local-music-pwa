# CLAUDE

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**Snae Player** - Privacy-first local music PWA built with **SvelteKit**, **TypeScript**, and **Tailwind CSS**. Emphasizes performance, type safety, and maintainability. Runs entirely in browser with no server dependencies.

## Technology Stack
- **SvelteKit 5** with Svelte Runes (`$state`, `$derived`, `$effect`)
- **TypeScript** strict mode, **Vite** (Rolldown), **pnpm** package manager
- **Tailwind CSS 4** with custom design system
- **IndexedDB** for local data, **Web Workers** for performance
- **Biome** linting, **Vitest** testing, **unplugin-auto-import**

## File Organization
```
src/routes/
├── (app)/              # Main app with player overlay
├── (marketing)/        # Landing page  
└── (assets)/          # Dynamic assets

src/lib/
├── components/         # UI components
├── stores/            # Global state (main/, player/)
├── db/                # IndexedDB layer
├── library/           # Music operations
├── helpers/           # Utilities
└── attachments/       # Svelte actions
```

## Design System

Use design tokens for color, typography and so on from `src/app.css`.

### Key Patterns
- **`.interactable`** - Required for all clickable elements
- **`.card`** - Container component styling
- **`--spacing(N)`** - Consistent spacing (never arbitrary values)
- **`{@attach ripple()}`** - Touch feedback
- **`{@attach tooltip()}`** - Hover tooltips

## Auto-Imports (`vite.config.ts`)
These are available globally without imports:
```typescript
m                    // Messages/i18n
usePlayer()          // Player store
useMainStore()       // Main store  
useMenu()            // Context menus
invariant()          // Runtime assertions
ClassValue, Snippet<T> // Global types
```

## Component Development

### Svelte 5 Pattern
```svelte
<script lang="ts">
  interface Props {
    items: string[]
    children: Snippet<[string]>
  }
  
  const { items, children }: Props = $props()
  let selected = $state(0)
  const filtered = $derived(items.filter(Boolean))
</script>

<div class="card text-body-md">
  {#each filtered as item, i}
    <button 
      class="interactable"
      onclick={() => selected = i}
    >
      {item}
    </button>
  {/each}
</div>
```

### Key Components
Find in `src/lib/components/`:
- `Button.svelte`, `IconButton.svelte`, `Icon.svelte`
- `Select.svelte`, `Switch.svelte`, `TextField.svelte`
- `Header.svelte`, `Separator.svelte`, `Spinner.svelte`
- `VirtualContainer.svelte` for large lists

## State Management

### Stores (Context-based with Svelte 5 runes)
```typescript
const mainStore = useMainStore() // Theme, settings
const player = usePlayer()       // Audio playback

// Main store properties
mainStore.theme, mainStore.isThemeDark, mainStore.motion

// Player store properties  
player.isPlaying, player.currentTrack, player.queue
player.play(), player.pause(), player.next()
```

### Persistence
Uses `persist()` helper for localStorage integration with reactive state.

## Database Layer (`src/lib/db/`)

### Architecture
- **IndexedDB** with reactive queries that auto-update UI
- **Type-safe** operations with Valibot validation

### Query Pattern
```typescript
// In route load functions
export const load = () => ({
  tracksQuery: getTracksQuery(),
})

// In components
const { data } = $props()
initPageQueries(data)
const tracks = $derived(data.tracksQuery.value)
```

### Database Entities
See `src/lib/library/types.ts` for: Track, Album, Artist, Playlist, Directory types.

## Performance & Development

### Performance Focus
- **Lazy loading** routes and components
- **Virtual scrolling** for large lists (VirtualContainer.svelte)
- **Web Workers** for CPU tasks
- **Debounced** user input

### Development Workflow
- **pnpm** for package management
- **Biome** primary linter, **Prettier** for Svelte
- **TypeScript** strict mode - no `any` types
- **Vitest** testing with `fake-indexeddb`

### Commands
```bash
pnpm run dev      # Development server
pnpm run build    # Production build  
pnpm run test     # Run tests
```

## Core Principles

### Architecture 
1. **Client-side only** - IndexedDB, File System Access API, Service Worker
2. **Type safety** - Strict TypeScript, Valibot validation, no `any`
3. **Performance** - Small bundles, virtual rendering, Web Workers
4. **Design consistency** - Design tokens, semantic colors, `.interactable`

### Error Handling
```typescript
invariant(condition, 'Error message') // Runtime assertions
// Route-level: +error.svelte
// Graceful degradation for missing browser APIs
```

---

## Quick Reference

### ✅ Always Do
- Use design system classes, not arbitrary Tailwind values
- Apply `.interactable` to clickable elements  
- Leverage auto-imports (m, usePlayer, useMainStore, useMenu, invariant)
- Use Svelte 5 runes for state management
- Type everything explicitly

### ❌ Never Do  
- Use arbitrary colors/spacing instead of design tokens
- Import auto-imported utilities
- Use `any` types
- Add server-side dependencies
- Skip accessibility attributes

### 📁 Key Files
- `src/app.css` - Design system & utilities
- `vite.config.ts` - Auto-import configuration  
- `src/app.d.ts` - Global types
- `src/lib/components/` - UI components
- `src/lib/stores/` - State management
- `src/lib/db/` - Database operations
- `biome.jsonc` - Code quality rules

## Error Handling

### Runtime Assertions
```typescript
import { invariant } from 'tiny-invariant' // Auto-imported

// Use for runtime checks
invariant(user, 'User must be defined')
invariant(tracks.length > 0, 'Must have tracks')
```

### Error Boundaries
- **Route-level** error handling with `+error.svelte`
- **Component-level** error states
- **Graceful degradation** for missing browser APIs

## Security Considerations

### Content Security Policy
- **Strict CSP** defined in `svelte.config.ts`
- **No inline scripts** except trusted sources

---

## Quick Reference

### Always Do
- ✅ Use pnpm when running commands
- ✅ Use design system classes, not arbitrary values
- ✅ Leverage auto-imports for common utilities  
- ✅ Use Svelte 5 runes for state management
- ✅ Type everything explicitly - avoid `any`
- ✅ Implement proper accessibility attributes

### Never Do  
- ❌ Use arbitrary Tailwind classes for colors/spacing
- ❌ Import utilities that are auto-imported
- ❌ Skip type annotations
- ❌ Ignore accessibility requirements
- ❌ Add server-side dependencies
- ❌ Use `any` types or escape TypeScript unless needed for type generics

### File References
- `src/app.css` - Design system & utilities
- `vite.config.ts` - Auto-import configuration
- `src/app.d.ts` - Global type definitions
- `src/lib/components/` - Reusable UI components
- `src/lib/stores/` - Global state management
- `src/lib/db/` - Database layer and queries
- `biome.jsonc` - Code quality configuration
