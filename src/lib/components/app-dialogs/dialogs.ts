// biome-ignore-all lint/suspicious/noExplicitAny: false positive
import ConfirmRemoveLibraryItem from './ConfirmRemoveLibraryItem.svelte'
import AddToPlaylistDialog from './playlists/AddToPlaylistDialog.svelte'
import EditPlaylistDialog from './playlists/EditPlaylistDialog.svelte'
import NewPlaylistDialog from './playlists/NewPlaylistDialog.svelte'

export const APP_DIALOGS_COMPONENTS = [
	ConfirmRemoveLibraryItem,
	AddToPlaylistDialog,
	NewPlaylistDialog,
	EditPlaylistDialog,
] as const
