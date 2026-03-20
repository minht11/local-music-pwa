import type { UpdatePlaylistOptions } from '$lib/library/playlists-actions'
import type { LibraryStoreName } from '$lib/library/types'

export type RemoveLibraryItemOptions =
	| {
			type: 'single'
			id: number
			name: string
			storeName: LibraryStoreName
	  }
	| {
			type: 'multiple'
			ids: readonly number[]
			storeName: 'tracks'
	  }

export class DialogsStore {
	createNewPlaylistDialogOpen: boolean = $state(false)

	editPlaylistDialogOpen: UpdatePlaylistOptions | null = $state(null)

	removeFromLibraryOpen: RemoveLibraryItemOptions | null = $state(null)

	addTrackToPlaylistDialogOpen: readonly number[] | null = $state(null)
}
