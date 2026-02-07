import type { MenuItem } from '$lib/components/menu/types.ts'
import type { Playlist } from '$lib/library/types.ts'
import type { MainStore } from '$lib/stores/main/store.svelte.ts'

export const getPlaylistMenuItems = (main: MainStore, playlist: Playlist): MenuItem[] => [
	{
		label: m.libraryEditPlaylist(),
		action: () => {
			main.editPlaylistDialogOpen = {
				id: playlist.id,
				name: playlist.name,
				description: playlist.description,
			}
		},
	},
	{
		label: m.libraryRemoveFromLibrary(),
		action: () => {
			main.removeFromLibraryOpen = {
				type: 'single',
				id: playlist.id,
				name: playlist.name,
				storeName: 'playlists',
			}
		},
	},
]
