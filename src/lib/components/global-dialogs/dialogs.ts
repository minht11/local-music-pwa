import type { Component } from 'svelte'
import type { DialogOpenAccessor } from '../dialog/Dialog.svelte'
import EqualizerDialog from './EqualizerDialog.svelte'
import AddToPlaylistDialog from './playlists/AddToPlaylistDialog.svelte'
import EditPlaylistDialog from './playlists/EditPlaylistDialog.svelte'
import NewPlaylistDialog from './playlists/NewPlaylistDialog.svelte'
import RemoveFromLibraryDialog from './RemoveFromLibraryDialog.svelte'

// biome-ignore lint/suspicious/noExplicitAny: needed for inference
type ComponentWithOpenProp = Component<{ open: DialogOpenAccessor<any> }>

export const APP_DIALOGS_COMPONENTS_MAP = {
	equalizer: EqualizerDialog,
	removeFromLibrary: RemoveFromLibraryDialog,
	addToPlaylist: AddToPlaylistDialog,
	newPlaylist: NewPlaylistDialog,
	editPlaylist: EditPlaylistDialog,
} satisfies Record<string, ComponentWithOpenProp>

export type AppDialogKey = keyof typeof APP_DIALOGS_COMPONENTS_MAP

export const APP_DIALOGS_KEYS = Object.keys(APP_DIALOGS_COMPONENTS_MAP) as AppDialogKey[]
