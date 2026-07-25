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

/**
 * Every predefined item, and whether it shows when the consumer sets no flag. A
 * set flag flips that, which is what the key names promise: 'disable*' hides an
 * item that shows by default, 'enable*' shows one that does not.
 */
const PREDEFINED_DEFAULTS = {
	disablePlayNext: true,
	disableAddToQueue: true,
	disableAddToPlaylist: true,
	disableRemoveFromLibrary: true,
	disableAddToFavorites: true,
	disableViewAlbum: true,
	disableViewArtist: true,
	enableMultiRemoveFromFavorites: false,
} as const

export type PredefinedTrackMenuItemOption = keyof typeof PREDEFINED_DEFAULTS

interface PredefinedMenuItem extends MenuActionItem {
	predefinedKey: PredefinedTrackMenuItemOption
}

type FalsyValue = false | undefined | null | ''

type UnfilteredPredefinedMenuItem = PredefinedMenuItem | FalsyValue

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
	predefinedItemsOptions: () => Partial<Record<PredefinedTrackMenuItemOption, boolean>>,
	getMultiSelectMenuItemsFn?: () =>
		| ((selection: SelectionSnapshot) => MenuItem[])
		| null
		| undefined,
) => {
	const dialogs = useDialogsStore()
	const player = usePlayer()

	const filterPredefinedItems = (items: UnfilteredPredefinedMenuItem[]): MenuItem[] => {
		const options = predefinedItemsOptions()

		return items.filter((item): item is PredefinedMenuItem => {
			if (!item) {
				return false
			}

			const flagged = options[item.predefinedKey] ?? false

			return flagged !== PREDEFINED_DEFAULTS[item.predefinedKey]
		})
	}

	const queueMenuItems = (ids: readonly number[]): UnfilteredPredefinedMenuItem[] => [
		{
			predefinedKey: 'disablePlayNext',
			label: m.playerPlayNext(),
			action: () => {
				player.queue.enqueue(ids, 'next')
			},
		},
		{
			predefinedKey: 'disableAddToQueue',
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
				predefinedKey: 'disableAddToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					dialogs.openDialog('addToPlaylist', [track.id])
				},
			},
			{
				predefinedKey: 'disableAddToFavorites',
				label: track.favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites(),
				action: () => {
					void toggleFavoriteTrack(track.favorite, track.id)
				},
			},
			albumName && {
				predefinedKey: 'disableViewAlbum',
				label: m.trackViewAlbum(),
				action: () => {
					void viewRelated('albums', albumName)
				},
			},
			artistName && {
				predefinedKey: 'disableViewArtist',
				label: m.trackViewArtist(),
				action: () => {
					void viewRelated('artists', artistName)
				},
			},
			{
				predefinedKey: 'disableRemoveFromLibrary',
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

		return joinWithSeparator(filterPredefinedItems(queueMenuItems([track.id])), [
			...filterPredefinedItems(predefinedItems),
			...(menuItems ? menuItems(track, row) : []),
		])
	}

	const getMultiSelectMenuItems = (selection: SelectionSnapshot) => {
		// One row per selected row, so track ids may repeat. Queue and playlist
		// additions act per row; per-track actions de-duplicate.
		const trackIds = selection.rows.map((row) => row.trackId)
		const uniqueTrackIds = [...new Set(trackIds)]

		const predefinedItems: UnfilteredPredefinedMenuItem[] = [
			{
				predefinedKey: 'disableAddToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					dialogs.openDialog('addToPlaylist', trackIds)
				},
			},
			{
				predefinedKey: 'disableAddToFavorites',
				label: m.trackAddToFavorites(),
				action: () => {
					uniqueTrackIds.forEach((trackId) => {
						void toggleFavoriteTrack(false, trackId)
					})
				},
			},
			{
				predefinedKey: 'enableMultiRemoveFromFavorites',
				label: m.trackRemoveFromFavorites(),
				action: () => {
					uniqueTrackIds.forEach((trackId) => {
						void toggleFavoriteTrack(true, trackId)
					})
				},
			},
			{
				predefinedKey: 'disableRemoveFromLibrary',
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

		return joinWithSeparator(filterPredefinedItems(queueMenuItems(trackIds)), [
			...filterPredefinedItems(predefinedItems),
			...(consumerItems ? consumerItems(selection) : []),
		])
	}

	return {
		getMenuItems,
		getMultiSelectMenuItems,
	}
}
