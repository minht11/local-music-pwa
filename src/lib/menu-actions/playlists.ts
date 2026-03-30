import type { MenuItem } from '$lib/components/menu/types.ts'
import type { Playlist } from '$lib/library/types.ts'
import type { DialogsStore } from '$lib/stores/dialogs/store.svelte.ts'

export const getPlaylistMenuItems = (dialogs: DialogsStore, playlist: Playlist): MenuItem[] => [
	{
		label: m.libraryEditPlaylist(),
		action: () => {
			dialogs.editPlaylistDialogOpen = {
				id: playlist.id,
				name: playlist.name,
				description: playlist.description,
			}
		},
	},
	{
		label: m.libraryRemoveFromLibrary(),
		action: () => {
			dialogs.removeFromLibraryOpen = {
				type: 'single',
				id: playlist.id,
				name: playlist.name,
				storeName: 'playlists',
			}
		},
	},
]
