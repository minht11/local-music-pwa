import ConfirmRemoveLibraryItem from './ConfirmRemoveLibraryItem.svelte'
// biome-ignore lint/correctness/noPrivateImports: false positive
import AddToPlaylistDialog from './playlists/AddToPlaylistDialog.svelte'
// biome-ignore lint/correctness/noPrivateImports: false positive
import EditPlaylistDialog from './playlists/EditPlaylistDialog.svelte'
// biome-ignore lint/correctness/noPrivateImports: false positive
import NewPlaylistDialog from './playlists/NewPlaylistDialog.svelte'

export const APP_DIALOGS_COMPONENTS = [
	ConfirmRemoveLibraryItem,
	AddToPlaylistDialog,
	NewPlaylistDialog,
	EditPlaylistDialog,
] as const
