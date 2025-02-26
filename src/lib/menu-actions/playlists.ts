import type { MenuItem } from '$lib/components/ListItem.svelte'
import type { Playlist } from '$lib/db/database-types'
import type { MainStore } from '$lib/stores/main/store.svelte.ts'

export const getPlaylistMenuItems = (main: MainStore, playlist: Playlist): MenuItem[] => [
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
		label: 'Remove playlist',
		action: () => {
			main.removePlaylistDialogOpen = {
				id: playlist.id,
				name: playlist.name,
			}
		},
	},
]
