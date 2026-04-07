import { getCatalog } from '../stores/catalog.svelte.ts'
import type { LibraryStoreName } from '$lib/library/types.ts'

/**
 * Hook for getLibraryValue
 * Fetches single item from in-memory catalog
 */
export const rajneeshGetLibraryValue = async <Store extends LibraryStoreName>(
	storeName: Store,
	id: number,
): Promise<any | undefined> => {
	if (storeName === 'playlists' || storeName === 'bookmarks') {
		return undefined
	}

	const catalog = getCatalog()
	if (!catalog) return undefined

	if (storeName === 'tracks') {
		const track = catalog.tracks.find((t) => t.id === id)
		if (track) {
			const album = catalog.albums.find((a) => a.name === track.album)
			const fallbackImage = track.image ?? (album?.image
				? {
						optimized: true,
						small: album.image as unknown as Blob,
						full: album.image as unknown as Blob,
					}
				: undefined)

			return {
				...track,
				image: fallbackImage,
				type: 'track',
			}
		}
	} else if (storeName === 'albums') {
		const album = catalog.albums.find((a) => a.id === id)
		if (album) {
			return {
				...album,
				type: 'album',
			}
		}
	} else if (storeName === 'artists') {
		if (catalog.artist.id === id) {
			return {
				...catalog.artist,
				type: 'artist',
			}
		}
	}

	return undefined
}
