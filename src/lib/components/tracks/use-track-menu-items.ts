import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { getDatabase } from '$lib/db/database.ts'
import type { TrackData } from '$lib/library/get/value'
import { toggleFavoriteTrack } from '$lib/library/playlists-actions'
import type { MenuActionItem, MenuItem } from '../menu/types.ts'
import type { SelectionSnapshot } from './selection.ts'

/**
 * The row a callback fires on: its index and identity. `entryId` equals the
 * track id on `items` lists, the real row entry id elsewhere.
 */
export interface TrackRowLocator {
	index: number
	entryId: number
}

/** Whether each predefined item shows when the consumer says nothing about it. */
const DEFAULT_VISIBILITY = {
	playNext: true,
	addToQueue: true,
	addToPlaylist: true,
	removeFromLibrary: true,
	addToFavorites: true,
	viewAlbum: true,
	viewArtist: true,
	// Multi-select only: the single-row menu folds both directions into `addToFavorites`.
	removeFromFavorites: false,
} as const

export type PredefinedTrackMenuItemKey = keyof typeof DEFAULT_VISIBILITY

/** Which predefined items to show, overriding `DEFAULT_VISIBILITY` per key. */
export type PredefinedTrackMenuItemVisibility = Partial<Record<PredefinedTrackMenuItemKey, boolean>>

interface PredefinedMenuItem extends MenuActionItem {
	key: PredefinedTrackMenuItemKey
}

/** An item guarded by a `name && {…}` expression, so it may be the falsy name. */
type UnfilteredPredefinedMenuItem = PredefinedMenuItem | '' | undefined

const joinWithSeparator = (queueItems: MenuItem[], otherItems: MenuItem[]): MenuItem[] => {
	if (queueItems.length === 0 || otherItems.length === 0) {
		return [...queueItems, ...otherItems]
	}

	return [...queueItems, { separator: true }, ...otherItems]
}

const viewRelated = async (store: 'albums' | 'artists', name: string) => {
	try {
		const db = await getDatabase()
		const album = await db.getFromIndex(store, 'name', name)
		invariant(album)

		const path = resolve('/(app)/library/[[slug=libraryEntities]]/[uuid]', {
			slug: store,
			uuid: album.uuid,
		})

		await goto(path)
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

export const useTrackMenuItems = (
	getMenuItemsFn: () =>
		| ((track: TrackData, row: TrackRowLocator) => MenuItem[])
		| null
		| undefined,
	predefinedItemsVisibility: () => PredefinedTrackMenuItemVisibility,
	getMultiSelectMenuItemsFn?: () =>
		| ((selection: SelectionSnapshot) => MenuItem[])
		| null
		| undefined,
) => {
	const dialogs = useDialogsStore()
	const player = usePlayer()

	const filterPredefinedItems = (items: UnfilteredPredefinedMenuItem[]): MenuItem[] => {
		const visibility = predefinedItemsVisibility()

		return items.filter(
			(item): item is PredefinedMenuItem =>
				!!item && (visibility[item.key] ?? DEFAULT_VISIBILITY[item.key]),
		)
	}

	/** Queue items lead, separated from the rest. */
	const assemble = (
		trackIds: readonly number[],
		predefinedItems: UnfilteredPredefinedMenuItem[],
		extraItems: MenuItem[],
	): MenuItem[] =>
		joinWithSeparator(filterPredefinedItems(queueMenuItems(trackIds)), [
			...filterPredefinedItems(predefinedItems),
			...extraItems,
		])

	const queueMenuItems = (ids: readonly number[]): PredefinedMenuItem[] => [
		{
			key: 'playNext',
			label: m.playerPlayNext(),
			action: () => {
				player.queue.enqueue(ids, 'next')
			},
		},
		{
			key: 'addToQueue',
			label: m.playerAddToQueue(),
			action: () => {
				player.queue.enqueue(ids, 'last')
			},
		},
	]

	const getMenuItems = (track: TrackData, row: TrackRowLocator) => {
		const albumName = track.album
		// In a future we should handle ability to view multiple artists
		const artistName = track.artists[0]

		const predefinedItems: UnfilteredPredefinedMenuItem[] = [
			{
				key: 'addToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					dialogs.openDialog('addToPlaylist', [track.id])
				},
			},
			{
				key: 'addToFavorites',
				label: track.favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites(),
				action: () => {
					void toggleFavoriteTrack(track.favorite, track.id)
				},
			},
			albumName && {
				key: 'viewAlbum',
				label: m.trackViewAlbum(),
				action: () => {
					void viewRelated('albums', albumName)
				},
			},
			artistName && {
				key: 'viewArtist',
				label: m.trackViewArtist(),
				action: () => {
					void viewRelated('artists', artistName)
				},
			},
			{
				key: 'removeFromLibrary',
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					dialogs.openDialog('removeFromLibrary', {
						type: 'single',
						name: track.name,
						id: track.id,
						storeName: 'tracks',
					})
				},
			},
		]

		const menuItems = getMenuItemsFn()

		return assemble([track.id], predefinedItems, menuItems ? menuItems(track, row) : [])
	}

	const getMultiSelectMenuItems = (selection: SelectionSnapshot) => {
		// One row per selected row, so track ids may repeat. Queue and playlist
		// additions act per row; per-track actions de-duplicate.
		const trackIds = selection.rows.map((row) => row.trackId)
		const uniqueTrackIds = [...new Set(trackIds)]

		const predefinedItems: PredefinedMenuItem[] = [
			{
				key: 'addToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					dialogs.openDialog('addToPlaylist', trackIds)
				},
			},
			{
				key: 'addToFavorites',
				label: m.trackAddToFavorites(),
				action: () => {
					uniqueTrackIds.forEach((trackId) => {
						void toggleFavoriteTrack(false, trackId)
					})
				},
			},
			{
				key: 'removeFromFavorites',
				label: m.trackRemoveFromFavorites(),
				action: () => {
					uniqueTrackIds.forEach((trackId) => {
						void toggleFavoriteTrack(true, trackId)
					})
				},
			},
			{
				key: 'removeFromLibrary',
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					dialogs.openDialog('removeFromLibrary', {
						type: 'multiple',
						ids: uniqueTrackIds,
						storeName: 'tracks',
					})
				},
			},
		]

		const consumerItems = getMultiSelectMenuItemsFn?.()

		return assemble(trackIds, predefinedItems, consumerItems ? consumerItems(selection) : [])
	}

	return {
		getMenuItems,
		getMultiSelectMenuItems,
	}
}
