import type { MenuItem } from '$lib/components/ListItem.svelte'
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
			main.removeLibraryItemOpen = {
				id: playlist.id,
				name: playlist.name,
				storeName: 'playlists',
			}
		},
	},
]
