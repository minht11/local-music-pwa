# GitHub Copilot Instructions for Snae Player

## Project Overview

**Snae Player** is a privacy-first local music PWA that runs entirely in the browser. Built with **SvelteKit 5**, **TypeScript**, and **Tailwind CSS 4**, it emphasizes performance, type safety, and maintainability.

### Core Features

- Local music playback using File System Access API or Files API fallback
- Privacy-preserving (no data sent to servers)
- IndexedDB for local storage and metadata
- Web Workers for performance-intensive operations
- Progressive Web App with offline support
- V1 to V2 database migration system

## Technology Stack

### Frontend Framework

- **SvelteKit 5** with Svelte Runes (`$state`, `$derived`, `$effect`)
- **TypeScript** strict mode with no `any` types
- **Tailwind CSS 4** with custom design system
- **Vite** (Rolldown) for building

### Core Dependencies

```json
{
	"dependencies": {
		"@floating-ui/dom": "^1.7.3",
		"@material/material-color-utilities": "^0.3.0",
		"@sveltejs/enhanced-img": "^0.8.0",
		"@tanstack/svelte-virtual": "^3.13.12",
		"idb": "^8.0.3",
		"music-metadata": "^11.8.2",
		"tiny-invariant": "^1.3.3",
		"valibot": "1.1.0"
	}
}
```

### Development Tools

- **pnpm** for package management
- **Biome** for linting (primary)
- **Prettier** for Svelte formatting
- **Vitest** for testing with `fake-indexeddb`
- **unplugin-auto-import** for global utilities

## File Organization

```
src/
├── routes/
│   ├── (app)/                 # Main application routes
│   │   ├── library/           # Music library interface
│   │   ├── player/           # Audio player interface
│   │   └── settings/         # App settings
│   ├── (marketing)/          # Landing page
│   └── (assets)/            # Dynamic asset routes
├── lib/
│   ├── components/          # Reusable UI components
│   │   ├── icon/           # Icon system
│   │   ├── tracks/         # Track-related components
│   │   └── playlists/      # Playlist components
│   ├── stores/             # Global state management
│   │   ├── main/           # App settings, theme
│   │   └── player/         # Audio playback state
│   ├── db/                 # IndexedDB operations
│   │   ├── query/          # Reactive database queries
│   │   └── v1-legacy/      # V1 migration support
│   ├── library/            # Music library operations
│   │   ├── scan-actions/   # File scanning and parsing
│   │   ├── playlists-actions.ts
│   │   └── types.ts
│   ├── helpers/            # Utility functions
│   └── attachments/        # Svelte actions
tests/
├── lib/
│   └── library/           # Library functionality tests
└── shared.ts             # Test utilities
```

## Design System & Styling

### Design Tokens

Use design tokens from `src/app.css` - never arbitrary values:

```css
/* Colors - semantic, theme-aware */
color: var(--color-primary)
color: var(--color-on-surface)
background: var(--color-surface-container)

/* Spacing - consistent scale */
margin: var(--spacing-4)
padding: var(--spacing-8)
gap: var(--spacing-2)

/* Typography */
font-size: var(--text-body-md)
font-size: var(--text-headline-sm)
```

### Required Patterns

```html
<!-- All clickable elements need .interactable -->
<button class="interactable">Click me</button>

<!-- Container styling -->
<div class="card">Content</div>

<!-- Touch feedback -->
<button {@attach ripple()}>Interactive</button>

<!-- Tooltips -->
<button {@attach tooltip('Help text')}>?</button>
```

### Typography Scale

- `text-display-lg` - Large headings
- `text-headline-md` - Section headers
- `text-title-md` - Component titles
- `text-body-md` - Default body text
- `text-label-md` - Form labels
- `text-caption` - Secondary text

## Auto-Imported Utilities

These are globally available without imports (configured in `vite.config.ts`):

```typescript
// Internationalization
m // Messages - m.tracks(), m.albums()

// Stores
usePlayer() // Audio player state
useMainStore() // App settings, theme
useMenu() // Context menus

// Utilities
invariant() // Runtime assertions
ClassValue // Type for class utilities
Snippet<T> // Type for Svelte snippets
```

## Component Development

### Svelte 5 Component Pattern

```svelte
<script lang="ts">
	interface Props {
		items: string[]
		selectedId?: number
		onSelect?: (id: number) => void
		children?: Snippet<[string, number]>
	}

	const { items, selectedId = 0, onSelect, children }: Props = $props()

	let internalState = $state(selectedId)
	const filteredItems = $derived(items.filter(Boolean))

	$effect(() => {
		// React to prop changes
		internalState = selectedId
	})
</script>

<div class="card">
	{#each filteredItems as item, i}
		<button
			class="interactable"
			class:selected={i === internalState}
			onclick={() => {
				internalState = i
				onSelect?.(i)
			}}
			{@attach ripple()}
		>
			{#if children}
				{@render children(item, i)}
			{:else}
				{item}
			{/if}
		</button>
	{/each}
</div>

<style>
	.selected {
		background: var(--color-primary-container);
		color: var(--color-on-primary-container);
	}
</style>
```

### Key Component Library

Available in `src/lib/components/`:

**Basic UI:**

- `Button.svelte` - Primary/secondary buttons
- `IconButton.svelte` - Icon-only buttons
- `Icon.svelte` - SVG icon system
- `TextField.svelte` - Text input fields
- `Select.svelte` - Dropdown selects
- `Switch.svelte` - Toggle switches

**Layout:**

- `Header.svelte` - Page headers
- `Separator.svelte` - Visual dividers
- `VirtualContainer.svelte` - Virtual scrolling for large lists
- `ListDetailsLayout.svelte` - Master-detail layout

**Music-specific:**

- `Artwork.svelte` - Album/track artwork
- `TracksListContainer.svelte` - Virtual track lists
- `PlaylistListContainer.svelte` - Playlist management

## State Management

### Store Architecture

Uses context-based stores with Svelte 5 runes:

```typescript
// Main application store
const mainStore = useMainStore()
mainStore.theme           // 'light' | 'dark' | 'auto'
mainStore.isThemeDark     // boolean derived
mainStore.motion          // boolean for animations

// Audio player store
const player = usePlayer()
player.isPlaying         // boolean
player.isPaused          // boolean
player.currentTrack      // Track | null
player.queue            // Track[]
player.position         // number (seconds)
player.duration         // number (seconds)

// Player actions
player.play(track?)     // Start playback
player.pause()          // Pause playback
player.next()           // Next track
player.previous()       // Previous track
player.seek(position)   // Seek to position
```

### Persistence

```typescript
// Auto-persisted state
const settings = persist('settings', {
	theme: 'auto',
	volume: 1.0,
})
```

## Database Layer

### Architecture

- **IndexedDB** via `idb` library
- **Reactive queries** that auto-update UI components
- **Type-safe** operations with Valibot validation
- **Migration system** for schema changes

### Database Schema

```typescript
interface Track {
	id: number
	uuid: string
	name: string
	artists: string[]
	album?: string
	year?: string
	duration: number
	genre: string[]
	fileName: string
	directory: number
	scannedAt: number
	file: File
}

interface Playlist {
	id: number
	uuid: string
	name: string
	description: string
	createdAt: number
}

interface PlaylistEntry {
	id: number
	playlistId: number
	trackId: number
	addedAt: number
}
```

### Database Operations

```typescript
// Basic operations
import { getDatabase } from '$lib/db/database.ts'

const db = await getDatabase()
const tracks = await db.getAll('tracks')
const track = await db.get('tracks', trackId)

// Reactive queries
import { createPageQuery } from '$lib/db/query/page-query.svelte.ts'

const tracksQuery = createPageQuery({
	queryFn: async () => {
		const db = await getDatabase()
		return await db.getAll('tracks')
	},
	onDatabaseChange: (changes) => {
		// Auto-refetch when tracks change
		return changes.some((c) => c.storeName === 'tracks')
	},
})
```

## Music Library Operations

### File Scanning

```typescript
// Scanner architecture
import { scanTracks } from '$lib/library/scan-actions/scan-tracks.ts'

// Scan new files
await scanTracks({
	action: 'scan-new-directory',
	files: fileEntities,
})

// Legacy migration
await scanTracks({
	action: 'legacy-files-migrate-from-v1',
	files: legacyFiles,
})
```

### Playlist Management

```typescript
import {
	dbCreatePlaylist,
	dbAddTracksToPlaylist,
	dbRemoveTracksFromPlaylist,
	toggleFavoriteTrack,
} from '$lib/library/playlists-actions.ts'

// Create playlist
const playlistId = await dbCreatePlaylist('My Playlist', 'Description')

// Add tracks
await dbAddTracksToPlaylist(playlistId, trackIds)

// Favorites
await toggleFavoriteTrack(trackId) // Adds/removes from favorites
```

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { clearDatabaseStores } from '../../shared.ts'

describe('component functionality', () => {
	afterEach(async () => {
		await clearDatabaseStores()
		vi.clearAllMocks()
	})

	it('should handle user interaction correctly', async () => {
		// Test implementation
	})
})
```

## Performance Best Practices

### Code Splitting

```typescript
// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent.svelte'))

// Lazy load routes (automatic with SvelteKit)
```

### Web Workers

```typescript
// CPU-intensive tasks in workers
// See: src/lib/library/scan-actions/scanner/worker.ts
```

## Error Handling

### Runtime Assertions

```typescript
import { invariant } from 'tiny-invariant' // Auto-imported

// Use for critical runtime checks
invariant(track, 'Track must be defined')
invariant(tracks.length > 0, 'Must have tracks to play')
```

### Error Boundaries

```svelte
<!-- +error.svelte for route-level errors -->
<script>
	import { page } from '$app/state'
	const { error } = $props()
</script>

<h1>Something went wrong</h1><p>{error.message}</p>
```

### Graceful Degradation

```typescript
// Feature detection
if ('showDirectoryPicker' in window) {
	// Use File System Access API
} else {
	// Fallback to File API
}
```

## Development Workflow

### Commands

```bash
# Development
pnpm run dev          # Start dev server

# Building
pnpm run build        # Production build
pnpm run preview      # Preview build

# Code Quality
pnpm run check        # Type checking
pnpm run biome-check  # Linting
pnpm run biome-fix    # Fix linting issues

# Testing
pnpm run test         # Run tests
pnpm run coverage     # Test coverage
```

### Code Quality Rules

#### Always Do ✅

- Use pnpm when running commands
- Leverage auto-imports for common utilities
- Use design system tokens, never arbitrary values
- Apply `.interactable` class to all clickable elements
- Leverage auto-imported utilities (don't import them)
- Use Svelte 5 runes for reactive state
- Type everything explicitly - avoid `any` types
- Handle loading and error states
- Include accessibility attributes
- Use `invariant()` for runtime checks
- Clear test mocks in `afterEach`

#### Never Do ❌

- Use arbitrary Tailwind classes for colors/spacing
- Import auto-imported utilities (m, usePlayer, useMainStore, etc.)
- Skip TypeScript strict mode checks
- Ignore accessibility requirements
- Add server-side dependencies except in `+server.ts` files
- Use `any` types except for complex generics
- Skip error handling
- Hardcode strings (use i18n messages)

### File Naming Conventions

- **Components**: `PascalCase.svelte`
- **Routes**: `+page.svelte`, `+layout.svelte`, `+page.ts`
- **Types**: `kebab-case.ts`
- **Stores**: `kebab-case.svelte.ts`
- **Tests**: `kebab-case.test.ts`

## Key Files Reference

### Configuration

- `vite.config.ts` - Build and auto-import configuration
- `svelte.config.ts` - SvelteKit configuration
- `biome.jsonc` - Code quality rules
- `tailwind.config.ts` - Tailwind customization

### Core Application

- `src/app.css` - Design system and global styles
- `src/app.d.ts` - Global TypeScript definitions
- `src/app.html` - HTML template
- `src/lib/stores/` - Global state management
- `src/lib/db/database.ts` - IndexedDB setup
