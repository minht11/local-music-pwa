import { getDatabase } from '$lib/db/database.ts'
import { type FileEntity, getFileHandlesRecursively } from '$lib/helpers/file-system.ts'
import { SerialQueue } from '$lib/helpers/serial-queue.ts'
import { dbRemoveTrack } from '$lib/library/remove.ts'
import { LEGACY_NO_NATIVE_DIRECTORY, type Track } from '$lib/library/types.ts'
import { dbImportTrack } from './import-track.ts'
import { getArtworkRelatedData } from './parse/format-artwork.ts'
import { parseTrackMetadata } from './parse/parse-track.ts'
import type { TracksScanMessage, TracksScanOptions } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

interface TrackEnqueueOptions {
	scannedAt: number
	unwrappedFile: File
	file: FileEntity
	directoryId: number
	/** In cases when track already was imported */
	trackId?: number
	uuid?: string
}

/**
 * A three-stage pipeline for track ingestion:
 * 1. [PARSING]  - Blocks the caller; processes one file at a time.
 * 2. [ARTWORK]  - Background serial queue for I/O-heavy image processing.
 * 3. [IMPORT]   - Background serial queue for final database writes.
 * - This "conveyor belt" allows the caller to parse the next track while
 * previous tracks progress through artwork and import stages concurrently.
 */
class TrackProcessor {
	#artworkQueue = new SerialQueue()
	#importQueue = new SerialQueue()

	#tracker: StatusTracker
	#onImportSuccess?: (trackId: number) => void

	constructor(tracker: StatusTracker, onImportSuccess?: (trackId: number) => void) {
		this.#tracker = tracker
		this.#onImportSuccess = onImportSuccess
	}

	async parseAndEnqueue(options: TrackEnqueueOptions) {
		const parsed = await parseTrackMetadata(options.unwrappedFile)
		if (!parsed) {
			return
		}

		this.#artworkQueue.enqueue(async () => {
			const artworkData = parsed.imageBlob
				? await getArtworkRelatedData(parsed.imageBlob)
				: undefined

			this.#importQueue.enqueue(async () => {
				try {
					const trackId = await dbImportTrack(
						{
							...parsed.data,
							...artworkData,
							file: options.file,
							directory: options.directoryId,
							fileName: options.file.name,
							scannedAt: options.scannedAt,
							uuid: options.uuid ?? crypto.randomUUID(),
						},
						options.trackId,
					)

					this.#onImportSuccess?.(trackId)
					this.#tracker.newlyImported += 1
				} catch (err) {
					console.error(err)
				} finally {
					this.#tracker.sendMsg(false)
				}
			})
		})
	}

	async drain(): Promise<void> {
		await this.#artworkQueue.drain()
		await this.#importQueue.drain()
	}
}

class StatusTracker {
	newlyImported = 0

	current = 0

	total = 0

	#pendingTimeout: number | null = null

	#timeId: string

	constructor(total: number, timeId: string) {
		this.total = total
		this.#timeId = timeId

		console.time(this.#timeId)
	}

	sendMsg = (finished: boolean) => {
		if (finished) {
			console.timeEnd(this.#timeId)
			if (this.#pendingTimeout) {
				self.clearTimeout(this.#pendingTimeout)
			}
		} else {
			if (this.#pendingTimeout) {
				return
			}

			this.#pendingTimeout = self.setTimeout(() => {
				this.#pendingTimeout = null
			}, 200)
		}

		const message: TracksScanMessage = {
			finished,
			count: {
				newlyImported: this.newlyImported,
				current: this.current,
				total: this.total,
			},
		}

		self.postMessage(message)
	}
}

const findTrackByFileHandle = async (handle: FileSystemFileHandle, tracks: Track[]) => {
	for (const track of tracks) {
		const isSame = await handle.isSameEntry(track.file as FileSystemFileHandle)
		if (isSame) {
			return track
		}
	}

	return null
}

const findTrackByMixedFileEntity = async (handle: FileEntity, tracks: Track[]) => {
	for (const track of tracks) {
		const existingFile = track.file
		// If file name is changed we can be sure it's not the same file anymore
		if (existingFile.name !== handle.name) {
			continue
		}

		if (
			existingFile instanceof FileSystemFileHandle &&
			handle instanceof FileSystemFileHandle
		) {
			const isSame = await handle.isSameEntry(existingFile)
			if (isSame) {
				return track
			}
		}

		// No reliable way to compare two Files,
		// so we compare their names and size
		if (
			existingFile instanceof File &&
			handle instanceof File &&
			existingFile.size === handle.size
		) {
			return track
		}
	}

	return null
}

const scanExistingDirectory = async (handles: FileEntity[], directoryId: number) => {
	const db = await getDatabase()

	const tracker = new StatusTracker(handles.length, 'SCAN_EXISTING_DIR')
	const scannedTracksIds = new Set<number>()
	const processor = new TrackProcessor(tracker, (trackId) => {
		scannedTracksIds.add(trackId)
	})

	const scannedAt = Date.now()

	const findTrackFn =
		directoryId === LEGACY_NO_NATIVE_DIRECTORY
			? findTrackByMixedFileEntity
			: findTrackByFileHandle

	for (const handle of handles) {
		tracker.current += 1

		try {
			// Real FS might have multiple files with the same name
			// but in the database we keep flat structure
			const possibleExistingTracks = await db.getAllFromIndex('tracks', 'path', [
				directoryId,
				handle.name,
			])
			const existingTrack = await findTrackFn(
				// If `LEGACY_NO_NATIVE_DIRECTORY` is used this will be a `File` or `FileSystemFileHandle`
				// in all other cases it will be a `FileSystemFileHandle`
				handle as FileSystemFileHandle,
				possibleExistingTracks,
			)

			const unwrappedFile = handle instanceof File ? handle : await handle.getFile()

			// File was not modified since last scan
			if (existingTrack && unwrappedFile.lastModified <= existingTrack.scannedAt) {
				scannedTracksIds.add(existingTrack.id)
				tracker.sendMsg(false)

				continue
			}

			await processor.parseAndEnqueue({
				unwrappedFile,
				file: handle,
				directoryId,
				trackId: existingTrack?.id,
				uuid: existingTrack?.uuid,
				scannedAt,
			})
		} catch {
			// we ignore errors and just move on to the next track.
		}
	}

	await processor.drain()

	if (directoryId === LEGACY_NO_NATIVE_DIRECTORY) {
		tracker.sendMsg(true)

		return
	}

	// After importing is done, we remove tracks that were not scanned
	// meaning they do not exist in the actual FS anymore
	const tracksIdsInDirectory = await db.getAllKeysFromIndex('tracks', 'directory', directoryId)
	for (const trackId of tracksIdsInDirectory) {
		if (!scannedTracksIds.has(trackId)) {
			await dbRemoveTrack(trackId).catch(console.warn)
		}
	}

	tracker.sendMsg(true)
}

const scanNewDirectory = async (handles: FileEntity[], directoryId: number) => {
	const tracker = new StatusTracker(handles.length, 'SCAN_NEW_DIR')
	const processor = new TrackProcessor(tracker)
	const scannedAt = Date.now()

	for (const handle of handles) {
		tracker.current += 1

		try {
			const unwrappedFile = handle instanceof File ? handle : await handle.getFile()

			await processor.parseAndEnqueue({
				unwrappedFile,
				file: handle,
				directoryId,
				scannedAt,
			})
		} catch {
			// we ignore errors and just move on to the next track
		}
	}

	await processor.drain()

	tracker.sendMsg(true)
}

export const workerAction = async (options: TracksScanOptions) => {
	if (options.action === 'directory-add') {
		const handles = await getFileHandlesRecursively(options.dirHandle)
		await scanNewDirectory(handles, options.dirId)

		return
	}

	if (options.action === 'directory-rescan') {
		const handles = await getFileHandlesRecursively(options.dirHandle)
		await scanExistingDirectory(handles, options.dirId)

		return
	}

	if (options.action === 'legacy-files-add') {
		await scanExistingDirectory(options.files, LEGACY_NO_NATIVE_DIRECTORY)
	}
}
