# Agent instructions

## Project Overview

**Snae Player** is a privacy-first local music PWA that runs entirely in the browser. Built with **SvelteKit 5**, **TypeScript**, and **Tailwind CSS 4**, it emphasizes performance, type safety, and maintainability.

### Core Features

- Local music playback using File System Access API or Files API fallback
- Privacy-preserving (no data sent to servers)
- IndexedDB for local storage and metadata
- Web Workers for performance-intensive operations
- Progressive Web App with offline support

## Technology Stack

### Frontend Framework

- **SvelteKit 5** with Svelte Runes (`$state`, `$derived`, `$effect`)
- **TypeScript** strict mode with no `any` types
- **Tailwind CSS 4** with custom design system in `src/app.css`
- **Vite 8** with Rolldown bundler

### Core Dependencies

```json
{
	"dependencies": {
		"@material/material-color-utilities": "^0.4.0",
		"@tanstack/virtual-core": "^3.13.23",
		"idb": "^8.0.3",
		"music-metadata": "^11.12.3",
		"tiny-invariant": "^1.3.3",
		"weak-lru-cache": "^1.2.2"
	}
}
```

### Development Tools

- **pnpm** for package management (`packageManager: pnpm@10.32.1`, Node `24.12.0`)
- **Biome** for linting (primary)
- **Prettier** for Svelte formatting
- **Vitest** for testing with `fake-indexeddb`
- **unplugin-auto-import** for global utilities
- **@inlang/paraglide-js** for i18n (compiled to `.generated/paraglide/`)

## File Organization

```
src/
├── routes/
│   ├── (app)/                     # Main application routes (with bottom bar)
│   │   ├── library/               # Music library with slug-based entity views
│   │   ├── player/                # Full-screen audio player (queue, history)
│   │   ├── layout/                # Layout-level setup (install prompt, theme)
│   │   └── (plain)/               # Routes without bottom nav bar
│   │       ├── settings/          # App settings
│   │       └── about/             # About page
│   ├── (marketing)/               # Landing page
│   └── (assets)/                  # Dynamic asset routes
├── lib/
│   ├── components/                # Reusable UI components
│   │   ├── icon/                  # SVG icon system
│   │   ├── tracks/                # Track list components
│   │   ├── playlists/             # Playlist components
│   │   ├── player/                # Player UI components
│   │   ├── menu/                  # Context menu system
│   │   ├── dialog/                # Modal dialogs
│   │   ├── snackbar/              # Toast notifications
│   │   ├── app-dialogs/           # App-level dialogs
│   │   ├── library-grid/          # Library grid layout
│   │   └── animated-icons/        # Animated icon components
│   ├── stores/                    # Global state management
│   │   ├── main/                  # App settings, theme (MainStore)
│   │   ├── player/                # Audio playback state (PlayerStore)
│   │   └── dialogs/               # Dialog state (DialogsStore)
│   ├── db/                        # IndexedDB operations
│   │   ├── query/                 # Reactive database queries
│   │   ├── database.ts            # DB schema & connection
│   │   └── events.ts              # DB change events
│   ├── library/                   # Music library operations
│   │   ├── scan-actions/          # File scanning and parsing
│   │   ├── get/                   # Query helpers (ids, values)
│   │   ├── playlists-actions.ts
│   │   ├── play-history-actions.ts
│   │   ├── tracks-queries.ts
│   │   └── types.ts
│   ├── helpers/                   # Utility functions
│   └── attachments/               # Svelte element attachments (ripple, tooltip)
tests/
├── lib/
│   └── library/                   # Library functionality tests
└── shared.ts                      # Test utilities (clearDatabaseStores)
```

## Design System & Styling

### Design Tokens

Use design tokens from `src/app.css` and `src/theme-colors.css` — **never arbitrary values**.

> **Critical**: Color token names use **camelCase**, not kebab-case.

```css
/* Colors - semantic, theme-aware (camelCase!) */
color: var(--color-primary)
color: var(--color-onSurface)              /* NOT --color-on-surface */
color: var(--color-onSurfaceVariant)
background: var(--color-surfaceContainer)  /* NOT --color-surface-container */
background: var(--color-surfaceContainerHigh)
background: var(--color-primaryContainer)
color: var(--color-onPrimaryContainer)

/* Spacing - use Tailwind spacing scale */
margin: --spacing(4)
padding: --spacing(8)
gap: --spacing(2)

/* Typography - use utility classes, not font-size directly */
/* Apply as CSS class: class="text-body-md" */
```

### Required Patterns

```html
<!-- All clickable elements need .interactable -->
<button class="interactable">Click me</button>

<!-- Container styling -->
<div class="card">Content</div>

<!-- Touch feedback (from $lib/attachments/ripple.ts) -->
<button {@attach ripple()}>Interactive</button>

<!-- Tooltips (from $lib/attachments/tooltip.ts) -->
<button {@attach tooltip('Help text')}>?</button>
```

### Typography Scale

Available as CSS utility classes (defined in `src/app.css`):

- `text-headline-lg` / `text-headline-md` / `text-headline-sm` - Headings
- `text-title-lg` / `text-title-md` / `text-title-sm` - Component titles
- `text-body-lg` / `text-body-md` / `text-body-sm` - Body text (default: `text-body-md`)
- `text-label-lg` / `text-label-md` / `text-label-sm` - Labels

## Auto-Imported Utilities

These are globally available without imports (configured in `vite.config.ts`). **Never import them manually.**

```typescript
// Internationalization (from @inlang/paraglide-js)
m.tracks()          // m.albums(), m.settings(), etc.

// Stores (context-based, call inside Svelte component tree)
usePlayer()         // Audio player state (PlayerStore)
useMainStore()      // App settings, theme (MainStore)
useDialogsStore()   // Dialog state (DialogsStore)
useMenu()           // Context menus (MenuAPI)

// Notifications
snackbar('Message text')              // Show toast
snackbar({ id: 'x', message: '...' }) // With options
snackbar.unexpectedError(error)        // Error toast
snackbar.dismiss('id')                 // Dismiss

// Utilities
invariant(condition, 'message')  // Runtime assertions (tiny-invariant)
untrack(() => value)             // Svelte untrack
```

Note: `Snippet<T>` and `ClassValue` are **Svelte/TypeScript built-in types**, not auto-imports.

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
		background: var(--color-primaryContainer);
		color: var(--color-onPrimaryContainer);
	}
</style>
```

### Key Component Library

Available in `src/lib/components/`:

**Basic UI:**

- `Button.svelte` - Primary/secondary buttons
- `IconButton.svelte` - Icon-only buttons
- `MenuButton.svelte` - Button that opens a context menu
- `Icon.svelte` - SVG icon system
- `TextField.svelte` - Text input fields
- `Select.svelte` - Dropdown selects
- `Switch.svelte` - Toggle switches
- `Slider.svelte` - Range slider
- `Tabs.svelte` - Tab navigation
- `Spinner.svelte` - Loading indicator
- `FavoriteButton.svelte` - Toggle favorite state

**Layout:**

- `Header.svelte` - Page headers
- `BackButton.svelte` - Navigation back button
- `Separator.svelte` - Visual dividers
- `ScrollContainer.svelte` - Scrollable container
- `VirtualContainer.svelte` - Virtual scrolling for large lists
- `ListDetailsLayout.svelte` - Master-detail layout
- `ListItem.svelte` - Generic list item

**Music-specific:**

- `Artwork.svelte` - Album/track artwork
- `PlayerOverlay.svelte` - Mini player overlay
- `TracksListContainer.svelte` - Virtual track lists (`src/lib/components/tracks/`)
- `PlaylistListContainer.svelte` - Playlist list (`src/lib/components/playlists/`)
- `AlbumsListContainer.svelte` - Albums grid/list
- `ArtistListContainer.svelte` - Artists list

## State Management

### Store Architecture

Uses context-based stores with Svelte 5 runes:

```typescript
// Main application store
const mainStore = useMainStore()
mainStore.theme                  // AppThemeOption: 'light' | 'dark' | 'auto'
mainStore.isThemeDark            // boolean (derived)
mainStore.motion                 // AppMotionOption: 'normal' | 'reduced' | 'auto'
mainStore.isReducedMotion        // boolean (derived)
mainStore.pickColorFromArtwork   // boolean
mainStore.volumeSliderEnabled    // boolean
mainStore.librarySplitLayoutEnabled // boolean

// Audio player store
const player = usePlayer()
player.playing          // boolean (true = playing)
player.loading          // boolean (true = loading audio)
player.activeTrack      // TrackData | undefined
player.itemsIds         // readonly number[] (queue track IDs)
player.currentTime      // number (seconds)
player.duration         // number (seconds)
player.volume           // number (0–100)
player.muted            // boolean
player.shuffle          // boolean
player.repeat           // PlayerRepeat: 'none' | 'one' | 'all'
player.equalizer        // EqualizerStore
player.artworkSrc       // string | undefined

// Player actions
player.playTrack(trackIds, options?)  // Set queue and play
player.togglePlay(force?)             // Toggle or force play/pause
player.playNext()                     // Next track
player.playPrev()                     // Previous track
player.seek(time)                     // Seek to time in seconds
player.toggleRepeat()                 // Cycle repeat mode
player.toggleShuffle()                // Toggle shuffle
player.addToQueue(trackId)            // Add track(s) to queue
player.removeFromQueue(index)         // Remove by queue index
player.clearQueue()                   // Empty the queue
```

### Persistence

Stores self-persist via the `persist()` helper (used internally in store constructors — do not call it for new ad-hoc values):

```typescript
// Inside a store class constructor
persist('storeName', this, ['fieldA', 'fieldB'])
// Keys are persisted to localStorage under snaeplayer-{storeName}.{key}
```

## Database Layer

### Architecture

- **IndexedDB** via `idb` library
- **Reactive queries** that auto-update UI components
- **Type-safe** operations
- **Migration system** for schema changes

### Database Schema

```typescript
// From $lib/library/types.ts
interface Track {
	id: number
	uuid: string
	name: string
	artists: StringOrUnknownItem[]
	album: StringOrUnknownItem
	year: StringOrUnknownItem
	duration: number
	genre: string[]
	trackNo: number
	trackOf: number
	discNo: number
	discOf: number
	fileName: string
	directory: number   // FK to Directory.id; -1 = legacy no-native-directory
	scannedAt: number
	file: FileEntity
	image?: { optimized: boolean; small: Blob; full: Blob }
	primaryColor?: number
}

interface Album {
	id: number
	uuid: string
	name: string
	artists: string[]
	year?: string
	image?: Blob
}

interface Artist {
	id: number
	uuid: string
	name: string
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

interface PlayHistoryEntry {
	id: number
	trackId: number
	playedAt: number
}

interface Directory {
	id: number
	handle: FileSystemDirectoryHandle
}
```

Stores: `tracks`, `albums`, `artists`, `playlists`, `playlistEntries`, `directories`, `playHistory`

Special constants from `$lib/library/types.ts`:

- `FAVORITE_PLAYLIST_ID = -1` — built-in favorites playlist (not user-modifiable)
- `UNKNOWN_ITEM = '~\0unknown'` — sentinel for unknown artist/album/year
- `LEGACY_NO_NATIVE_DIRECTORY = -1` — for tracks without a directory handle

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
pnpm run type-check   # Type checking
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

## Key Files Reference

### Configuration

- `vite.config.ts` - Build and auto-import configuration
- `svelte.config.js` - SvelteKit configuration
- `biome.jsonc` - Code quality rules

### Core Application

- `src/app.css` - Design system and global styles
- `src/theme-colors.css` - Color design tokens (camelCase names)
- `src/app.d.ts` - Global TypeScript definitions
- `src/app.html` - HTML template
- `src/lib/stores/` - Global state management
- `src/lib/db/database.ts` - IndexedDB setup
