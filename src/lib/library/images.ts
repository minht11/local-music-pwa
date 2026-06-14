/** biome-ignore-all lint/style/noRestrictedGlobals: structural typing of IDB store views */
import { getDatabase } from '$lib/db/database'
import type { DatabaseChangeDetails } from '$lib/db/events.ts'
import { keyRangeOnly } from '$lib/db/key-range.ts'

interface CountableImageIndex {
	count: (query: IDBKeyRange) => Promise<number>
}

interface DeletableImagesStore {
	delete: (key: string) => Promise<void>
}

export interface ImageGcStores {
	tracksByImage: CountableImageIndex
	albumsByImage: CountableImageIndex
	imagesStore: DeletableImagesStore
}

/**
 * Deletes any image records in `imageHashes`
 * that are no longer referenced by a track or album.
 */
export const dbDeleteOrphanedImagesWithTx = async (
	{ tracksByImage, albumsByImage, imagesStore }: ImageGcStores,
	imageHashes: readonly (string | undefined)[],
): Promise<DatabaseChangeDetails[]> => {
	const candidates = [...new Set(imageHashes.filter((hash) => hash !== undefined))]
	if (candidates.length === 0) {
		return []
	}

	const changes: DatabaseChangeDetails[] = []
	for (const imageHash of candidates) {
		const [trackRefs, albumRefs] = await Promise.all([
			tracksByImage.count(keyRangeOnly<'tracks', 'imageHash'>(imageHash)),
			albumsByImage.count(keyRangeOnly<'albums', 'imageHash'>(imageHash)),
		])

		if (trackRefs > 0 || albumRefs > 0) {
			continue
		}

		await imagesStore.delete(imageHash)
		changes.push({
			storeName: 'images',
			key: imageHash,
			operation: 'delete',
		})
	}

	return changes
}

/** @public */
export const dbGetImageRecord = async (imageHash: string) => {
	const db = await getDatabase()
	const record = await db.get('images', imageHash)

	return record
}
