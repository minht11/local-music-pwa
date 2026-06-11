/** biome-ignore-all lint/style/noRestrictedGlobals: structural typing of IDB store views */
import { getDatabase } from '$lib/db/database'
import type { DatabaseChangeDetails } from '$lib/db/events.ts'
import { keyRangeOnly } from '$lib/db/key-range.ts'

/**
 * Minimal structural views of the stores image GC touches. Typing against these
 * instead of the concrete `IDBPTransaction` sidesteps idb's invariant
 * transaction generics, so both the import and removal transactions — which
 * open different sets of stores — can pass their object stores here directly.
 */
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
 * Deletes any image records in `imageIds` that are no longer referenced by a
 * track or album. Image records are content-addressed and immutable, so they
 * can only ever be orphaned by deleting/updating the records that point at them
 * — which is why this runs inside those same transactions, after the track and
 * album mutations are visible to the index counts.
 */
export const dbDeleteOrphanedImagesWithTx = async (
	{ tracksByImage, albumsByImage, imagesStore }: ImageGcStores,
	imageIds: readonly (string | undefined)[],
): Promise<DatabaseChangeDetails[]> => {
	const candidates = [...new Set(imageIds.filter((id) => id !== undefined))]
	if (candidates.length === 0) {
		return []
	}

	const changes: DatabaseChangeDetails[] = []
	for (const imageId of candidates) {
		const [trackRefs, albumRefs] = await Promise.all([
			tracksByImage.count(keyRangeOnly<'tracks', 'imageId'>(imageId)),
			albumsByImage.count(keyRangeOnly<'albums', 'imageId'>(imageId)),
		])

		if (trackRefs > 0 || albumRefs > 0) {
			continue
		}

		await imagesStore.delete(imageId)
		changes.push({
			storeName: 'images',
			key: imageId,
			operation: 'delete',
		})
	}

	return changes
}

/** @public */
export const dbGetImageRecord = async (imageId: string) => {
	const db = await getDatabase()
	const record = await db.get('images', imageId)

	return record
}
