import type { MenuItem } from '$lib/components/ListItem.svelte'
import type { Playlist } from '$lib/library/types.ts'
import type { MainStore } from '$lib/stores/main/store.svelte.ts'

export const getAlbumMenuItems = (main: MainStore, playlist: Playlist): MenuItem[] => [
	{
		label: 'Edit playlist',
		action: () => {
			main.editPlaylistDialogOpen = {
				id: playlist.id,
				name: playlist.name,
			}
		},
	},
	{
		label: 'Remove from library',
		action: () => {
			main.removeLibraryItemOpen = {
				id: playlist.id,
				name: playlist.name,
				storeName: 'albums',
			}
		},
	},
]
