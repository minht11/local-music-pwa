import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { getDatabase } from '$lib/db/database.ts'
import type { TrackData } from '$lib/library/get/value'
import { toggleFavoriteTrack } from '$lib/library/playlists-actions'
import type { MenuItem } from '../menu/types.ts'

export type PredefinedTrackMenuItemOption =
	| 'disableAddToQueue'
	| 'disableAddToPlaylist'
	| 'disableRemoveFromLibrary'
	| 'disableAddToFavorites'
	| 'disableViewAlbum'
	| 'disableViewArtist'
	| 'enableMultiRemoveFromFavorites'

interface PredefinedMenuItem extends MenuItem {
	predefinedKey: PredefinedTrackMenuItemOption
}

type FalsyValue = false | undefined | null | ''

type UnfilteredPredefinedMenuItem = PredefinedMenuItem | FalsyValue

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
	getMenuItemsFn: () => ((track: TrackData, index: number) => MenuItem[]) | null | undefined,
	predefinedItemsOptions: () => Partial<Record<PredefinedTrackMenuItemOption, boolean>>,
) => {
	const main = useMainStore()
	const player = usePlayer()

	const filterPredefinedItems = (items: UnfilteredPredefinedMenuItem[]) => {
		const options = predefinedItemsOptions()
		const predefinedItems = items.filter((item) => {
			if (!item) {
				return false
			}

			const valueFromOptions = options[item.predefinedKey]

			if (item.predefinedKey.startsWith('disable')) {
				return valueFromOptions === undefined ? true : !valueFromOptions
			}

			return valueFromOptions ?? false
		}) as MenuItem[]

		return predefinedItems
	}

	const getMenuItems = (track: TrackData, index: number) => {
		const albumName = track.album
		// In a future we should handle ability to view multiple artists
		const artistName = track.artists[0]

		const predefinedItems: UnfilteredPredefinedMenuItem[] = [
			{
				predefinedKey: 'disableAddToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					main.addTrackToPlaylistDialogOpen = [track.id]
				},
			},
			{
				predefinedKey: 'disableAddToFavorites',
				label: track.favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites(),
				action: () => {
					void toggleFavoriteTrack(track.favorite, track.id)
				},
			},
			{
				predefinedKey: 'disableAddToQueue',
				label: m.playerAddToQueue(),
				action: () => {
					player.addToQueue(track.id)
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
					main.removeFromLibraryOpen = {
						type: 'single',
						name: track.name,
						id: track.id,
						storeName: 'tracks',
					}
				},
			},
		]

		const menuItems = getMenuItemsFn()

		return [
			...filterPredefinedItems(predefinedItems),
			...(menuItems ? menuItems(track, index) : []),
		]
	}

	const getMultiSelectMenuItems = (trackIds: readonly number[]) => {
		const predefinedItems: UnfilteredPredefinedMenuItem[] = [
			{
				predefinedKey: 'disableAddToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					main.addTrackToPlaylistDialogOpen = trackIds
				},
			},
			{
				predefinedKey: 'disableAddToFavorites',
				label: m.trackAddToFavorites(),
				action: () => {
					trackIds.forEach((trackId) => {
						void toggleFavoriteTrack(false, trackId)
					})
				},
			},
			{
				predefinedKey: 'disableAddToQueue',
				label: m.playerAddToQueue(),
				action: () => {
					trackIds.forEach((trackId) => {
						player.addToQueue(trackId)
					})
				},
			},
			{
				predefinedKey: 'enableMultiRemoveFromFavorites',
				label: m.trackRemoveFromFavorites(),
				action: () => {
					trackIds.forEach((trackId) => {
						void toggleFavoriteTrack(true, trackId)
					})
				},
			},
			{
				predefinedKey: 'disableRemoveFromLibrary',
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					main.removeFromLibraryOpen = {
						type: 'multiple',
						ids: trackIds,
						storeName: 'tracks',
					}
				},
			},
		]

		return filterPredefinedItems(predefinedItems)
	}

	return {
		getMenuItems,
		getMultiSelectMenuItems,
	}
}
