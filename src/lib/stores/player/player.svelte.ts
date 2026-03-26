import { onDatabaseChange } from '$lib/db/events.ts'
import type { QueryResult } from '$lib/db/query/query.ts'
import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { toShuffledArray } from '$lib/helpers/utils/array.ts'
import { clamp } from '$lib/helpers/utils/clamp.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { formatArtists } from '$lib/helpers/utils/text.ts'
import { throttle } from '$lib/helpers/utils/throttle.ts'
import { createTrackQuery, type TrackData } from '$lib/library/get/value-queries.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
import { cleanupTrackAudio, loadTrackAudio } from './audio.ts'
import {
	addActiveMinute,
	clearActiveMinutesForTrack,
	getLatestActiveMinutesByTrack,
	type ActiveMinuteDraft,
} from '$lib/db/active-minutes.ts'
import type { ActiveMinute } from '$lib/db/database.ts'
import { trackListenedMinute } from '$lib/rajneesh/analytics/posthog'
import {
	ensureCompletedTracksLoaded,
	isTrackCompleted,
	markTrackCompleted,
} from '$lib/stores/completed-tracks.svelte.ts'

export interface PlayTrackOptions {
	shuffle?: boolean
	startTimeSeconds?: number
	sourceContext?: 'library' | 'shorts'
}

export type PlayerRepeat = 'none' | 'one' | 'all'

const PLAYER_AUDIO_OWNER_KEY = '__rajneesh_player_audio_owner__'
type PlayerAudioOwnerGlobal = typeof globalThis & {
	[PLAYER_AUDIO_OWNER_KEY]?: HTMLAudioElement
}

const claimPlayerAudioOwnership = (audio: HTMLAudioElement): void => {
	const globalState = globalThis as PlayerAudioOwnerGlobal
	const currentOwner = globalState[PLAYER_AUDIO_OWNER_KEY]
	if (currentOwner && currentOwner !== audio) {
		currentOwner.pause()
		cleanupTrackAudio(currentOwner)
		currentOwner.removeAttribute('src')
		currentOwner.load()
	}

	globalState[PLAYER_AUDIO_OWNER_KEY] = audio
}

const releasePlayerAudioOwnership = (audio: HTMLAudioElement): void => {
	const globalState = globalThis as PlayerAudioOwnerGlobal
	if (globalState[PLAYER_AUDIO_OWNER_KEY] === audio) {
		delete globalState[PLAYER_AUDIO_OWNER_KEY]
	}
}

export class PlayerStore {
	#main = useMainStore()

	#audio = new Audio()

	static readonly PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2] as const

	shuffle: boolean = $state(false)

	repeat: PlayerRepeat = $state('none')

	playing: boolean = $state(false)

	loading: boolean = $state(false)

	playbackError: string | null = $state(null)

	currentTime: number = $state(0)

	duration: number = $state(0)

	#volume = $state(100)

	playbackRate: (typeof PlayerStore.PLAYBACK_RATES)[number] = $state(1)

	currentActiveMinute: ActiveMinuteDraft | null = $state(null)
	#activeMinutesByTrack = $state(new Map<string, ActiveMinute>())
	#didRestoreFromHistory = false
	#onDatabaseChangeCleanup: (() => void) | null = null

	get volume() {
		if (!this.#main.volumeSliderEnabled) {
			return 100
		}

		return this.#volume
	}

	set volume(value: number) {
		this.#volume = clamp(value, 0, 100)
	}

	muted: boolean = $state(false)

	get isQueueEmpty(): boolean {
		return this.itemsIds.length === 0
	}

	#activeTrackIndex = $state(-1)
	#itemsIdsOriginalOrder = $state<number[]>([])
	#itemsIdsShuffled = $state<number[] | null>(null)
	#autoplayOnLoad = true
	#pendingStartTimeSeconds: number | null = null
	sourceContext: 'library' | 'shorts' = $state('library')
	sourceStartTimeSeconds: number | null = $state(null)

	itemsIds: readonly number[] = $derived(
		this.#itemsIdsShuffled ? this.#itemsIdsShuffled : this.#itemsIdsOriginalOrder,
	)

	activeTrackQuery: QueryResult<TrackData | undefined> = createTrackQuery(
		() => this.itemsIds[this.#activeTrackIndex] ?? -1,
		{
			allowEmpty: true,
		},
	)

	activeTrack: TrackData | undefined = $derived(this.activeTrackQuery.value)

	get activeTrackIndex(): number {
		return this.#activeTrackIndex
	}

	#artwork = createManagedArtwork(() => this.activeTrack?.image?.full)
	artworkSrc: string | undefined = $derived.by(this.#artwork)

	constructor() {
		persist('player', this, ['volume', 'shuffle', 'repeat', 'muted'])

		const audio = this.#audio
		claimPlayerAudioOwnership(audio)

		void this.#initializeFromHistory()

		$effect(() => {
			// If audio state matches our state
			// we do not need to do anything
			if (audio.paused === !this.playing) {
				return
			}

			if (this.playing) {
				claimPlayerAudioOwnership(audio)
				void audio.play().catch(() => {
					this.playing = false
				})
				return
			}

			audio.pause()
		})

		const onAudioPlayPauseHandler = () => {
			const currentAudioState = !audio.paused

			if (currentAudioState !== this.playing) {
				// If our state is out of sync with audio element, sync it.
				this.playing = currentAudioState
			}
		}

		audio.onended = () => {
			if (this.activeTrack) {
				void markTrackCompleted(this.activeTrack.uuid)
				this.destroyCurrentActiveMinute()
				void this.clearTrackTimestamp(this.activeTrack.uuid)
			}

			if (this.repeat === 'one') {
				this.playTrack(this.#activeTrackIndex)

				return
			}

			if (this.repeat === 'none' && this.#activeTrackIndex === this.itemsIds.length - 1) {
				return
			}

			this.playNext()
		}

		audio.onpause = () => {
			onAudioPlayPauseHandler()
			this.destroyCurrentActiveMinute()
		}
		audio.onplay = () => {
			onAudioPlayPauseHandler()
			this.playbackError = null
			if (this.activeTrack) {
				this.ensureActiveMinuteForCurrentTime(this.activeTrack.uuid, audio.currentTime)
			}
		}

		audio.onwaiting = () => {
			this.loading = true
		}
		audio.oncanplay = () => {
			this.loading = false
			this.playbackError = null
		}
		audio.onerror = () => {
			this.loading = false
			this.playing = false
			this.playbackError = m.errorPlaybackFailed()
		}

		audio.ondurationchange = () => {
			this.duration = audio.duration
		}

		audio.ontimeupdate = throttle(() => {
			this.currentTime = audio.currentTime
			if (this.activeTrack) {
				this.saveTrackTimestamp(this.activeTrack.uuid, audio.currentTime)
			}
		}, 1000)

		$effect(() => {
			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			audio.volume = (this.volume / 100) ** k
		})

		$effect(() => {
			audio.playbackRate = this.playbackRate
		})

		const reset = debounce(() => {
			if (!this.activeTrack) {
				this.resetAudio()
			}
		}, 100)

		let prevTrack: { id: number; loaded: boolean } | null = null
		$effect(() => {
			const track = this.activeTrack

			if (track) {
				if (prevTrack?.id === track.id && prevTrack.loaded) {
					return
				}

				prevTrack = { id: track.id, loaded: false }

				reset.cancel()
				this.resetAudio()
				const savedTimestamp = this.#pendingStartTimeSeconds ?? this.getSavedTrackTimestamp(track.uuid)
				this.#pendingStartTimeSeconds = null
				this.currentTime = savedTimestamp
				const shouldAutoplay = this.#autoplayOnLoad
				this.#autoplayOnLoad = true
				this.playbackError = null
				this.loading = true
				void loadTrackAudio(this.#audio, track.file, track.uuid).then(async (loaded) => {
					if (prevTrack?.id !== track.id) {
						return
					}

					if (!loaded) {
						this.playing = false
						this.loading = false
						this.playbackError = m.errorPlaybackFailed()
						return
					}

					prevTrack.loaded = loaded

					const targetTime = this.currentTime
					if (targetTime > 0) {
						if (audio.readyState >= 1) {
							audio.currentTime = targetTime
						} else {
							const setTimeOnLoad = () => {
								audio.currentTime = targetTime
								audio.removeEventListener('loadedmetadata', setTimeOnLoad)
							}
							audio.addEventListener('loadedmetadata', setTimeOnLoad)
						}
					}

					if (shouldAutoplay) {
						try {
							await audio.play()
						} catch {
							this.playing = false
							this.loading = false
							this.playbackError = m.errorPlaybackFailed()
						}
					} else {
						audio.pause()
						this.playing = false
					}
				})
			} else {
				untrack(() => {
					this.playing = false
				})
				this.playbackError = null
				reset()

				prevTrack = null
			}
		})

		this.#onDatabaseChangeCleanup = onDatabaseChange((changes) => {
			for (const change of changes) {
				if (change.storeName !== 'tracks') {
					continue
				}

				if (change.operation === 'delete') {
					const index = this.itemsIds.indexOf(change.key)

					if (index === -1) {
						continue
					}

					if (index < this.#activeTrackIndex) {
						this.#activeTrackIndex -= 1
					} else if (index === this.#activeTrackIndex) {
						this.#activeTrackIndex = -1
					}

					if (this.#itemsIdsShuffled) {
						this.#itemsIdsShuffled.splice(index, 1)
						const originalIndex = this.#itemsIdsOriginalOrder.indexOf(change.key)
						if (originalIndex !== -1) {
							this.#itemsIdsOriginalOrder.splice(originalIndex, 1)
						}
					} else {
						this.#itemsIdsOriginalOrder.splice(index, 1)
					}
				}
			}
		})

		const ms = window.navigator.mediaSession

		$effect(() => {
			const track = this.activeTrack

			if (!track) {
				ms.metadata = null
				return
			}

			ms.metadata = new MediaMetadata({
				title: track.name,
				artist: formatArtists(track.artists),
				album: track.album,
				artwork: [
					{
						src: this.artworkSrc ?? new URL('/artwork.svg', location.origin).toString(),
						sizes: '512x512',
					},
				],
			})
		})

		// Done for minification purposes.
		const setActionHandler = ms.setActionHandler.bind(ms)
		const seekBack = () => this.seek(Math.max(this.currentTime - 15, 0))
		const seekForward = () =>
			this.seek(Math.min(this.currentTime + 15, this.duration || Infinity))

		setActionHandler('play', this.togglePlay.bind(null, true))
		setActionHandler('pause', this.togglePlay.bind(null, false))
		setActionHandler('previoustrack', seekBack)
		setActionHandler('nexttrack', seekForward)
		setActionHandler('seekbackward', seekBack)
		setActionHandler('seekforward', seekForward)
	}

	togglePlay = (force?: boolean): void => {
		if (!this.activeTrack) {
			return
		}

		const nextPlaying = force ?? !this.playing
		if (nextPlaying) {
			this.playbackError = null
		}
		this.playing = nextPlaying
	}

	playNext = (): void => {
		let newIndex = this.#activeTrackIndex + 1
		if (newIndex >= this.itemsIds.length) {
			newIndex = 0
		}

		this.playTrack(newIndex)
	}

	playPrev = (): void => {
		let newIndex = this.#activeTrackIndex - 1
		if (newIndex < 0) {
			newIndex = this.itemsIds.length - 1
		}

		this.playTrack(newIndex)
	}

	playTrack = (
		trackIndex: number,
		queue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		this.playbackError = null
		this.#autoplayOnLoad = true
		this.sourceContext = options.sourceContext ?? 'library'
		this.sourceStartTimeSeconds = options.startTimeSeconds ?? null
		if (queue) {
			this.#itemsIdsOriginalOrder = [...queue]
			// Unless explicitly set, shuffle is reset when new queue is passed
			this.shuffle = options.shuffle ?? false

			if (this.shuffle) {
				this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)
			} else if (this.#itemsIdsShuffled) {
				this.#itemsIdsShuffled = null
			}
		}

		if (this.itemsIds.length === 0) {
			this.#activeTrackIndex = -1
			return
		}

		this.#pendingStartTimeSeconds = options.startTimeSeconds ?? null
		const nextIndex = options.shuffle ? 0 : trackIndex
		const nextTrackId = this.itemsIds[nextIndex]
		const isSameTrack = nextTrackId !== undefined && nextTrackId === this.activeTrack?.id

		this.#activeTrackIndex = nextIndex
		if (isSameTrack) {
			const nextTime = options.startTimeSeconds ?? this.currentTime
			this.seek(nextTime)
		} else {
			this.currentTime = options.startTimeSeconds ?? 0
		}
		this.togglePlay(true)
	}

	prepareTrack = (
		trackIndex: number,
		queue?: readonly number[],
		options: PlayTrackOptions = {},
	): void => {
		this.playbackError = null
		this.#autoplayOnLoad = false
		this.sourceContext = options.sourceContext ?? 'library'
		this.sourceStartTimeSeconds = options.startTimeSeconds ?? null
		if (queue) {
			this.#itemsIdsOriginalOrder = [...queue]
			this.shuffle = options.shuffle ?? false

			if (this.shuffle) {
				this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)
			} else if (this.#itemsIdsShuffled) {
				this.#itemsIdsShuffled = null
			}
		}

		if (this.itemsIds.length === 0) {
			this.#activeTrackIndex = -1
			return
		}

		this.#pendingStartTimeSeconds = options.startTimeSeconds ?? null
		const nextIndex = options.shuffle ? 0 : trackIndex
		const nextTrackId = this.itemsIds[nextIndex]
		const isSameTrack = nextTrackId !== undefined && nextTrackId === this.activeTrack?.id

		this.#activeTrackIndex = nextIndex
		if (isSameTrack) {
			const nextTime = options.startTimeSeconds ?? this.currentTime
			this.seek(nextTime)
		} else {
			this.currentTime = options.startTimeSeconds ?? 0
		}
		this.playing = false
	}

	seek = (time: number): void => {
		this.currentTime = time
		this.#audio.currentTime = time
	}

	retryPlayback = (): void => {
		const track = this.activeTrack
		if (!track) {
			return
		}

		const audio = this.#audio
		const targetTime = this.currentTime
		this.playbackError = null
		this.resetAudio()
		this.currentTime = targetTime
		this.loading = true
		this.playing = true

		void loadTrackAudio(audio, track.file, track.uuid).then(async (loaded) => {
			// Ignore stale retry completions after track changed.
			if (this.activeTrack?.id !== track.id) {
				return
			}

			if (!loaded) {
				this.playing = false
				this.loading = false
				this.playbackError = m.errorPlaybackFailed()
				return
			}

			if (targetTime > 0) {
				if (audio.readyState >= 1) {
					audio.currentTime = targetTime
				} else {
					const setTimeOnLoad = () => {
						audio.currentTime = targetTime
						audio.removeEventListener('loadedmetadata', setTimeOnLoad)
					}
					audio.addEventListener('loadedmetadata', setTimeOnLoad)
				}
			}

			try {
				await audio.play()
			} catch {
				this.playing = false
				this.loading = false
				this.playbackError = m.errorPlaybackFailed()
			}
		})
	}

	#getActiveMinuteTimestamp = (timestampMs: number): number => {
		return Math.floor(timestampMs / 60000) * 60000
	}

	#updateLatestActiveMinute = (minute: ActiveMinute): void => {
		const next = new Map(this.#activeMinutesByTrack)
		const existing = next.get(minute.trackId)
		if (!existing || minute.activeMinuteTimestampMs >= existing.activeMinuteTimestampMs) {
			next.set(minute.trackId, minute)
			this.#activeMinutesByTrack = next
		}
	}

	#persistActiveMinute = async (minute: ActiveMinuteDraft): Promise<void> => {
		const payload: ActiveMinuteDraft = {
			activeMinuteTimestampMs: minute.activeMinuteTimestampMs,
			trackId: minute.trackId,
			trackTimestampMs: minute.trackTimestampMs,
			playbackRate: minute.playbackRate,
		}
		const saved = await addActiveMinute(payload)
		this.#updateLatestActiveMinute(saved)
		trackListenedMinute(payload)
	}

	#loadActiveMinutesCache = async (): Promise<void> => {
		const latest = await getLatestActiveMinutesByTrack()
		this.#activeMinutesByTrack = latest
	}

	#initializeFromHistory = async (): Promise<void> => {
		await this.#loadActiveMinutesCache()
		await this.#restoreLastPlayedTrack()
	}

	#restoreLastPlayedTrack = async (): Promise<void> => {
		if (this.#didRestoreFromHistory || !this.isQueueEmpty) {
			return
		}

		this.#didRestoreFromHistory = true
		await ensureCompletedTracksLoaded()

		const latestMinute = Array.from(this.#activeMinutesByTrack.values())
			.filter((minute) => !isTrackCompleted(minute.trackId))
			.sort((a, b) => b.activeMinuteTimestampMs - a.activeMinuteTimestampMs)[0]

		if (!latestMinute) {
			return
		}

		const trackId = await getLibraryItemIdFromUuid('tracks', latestMinute.trackId)
		if (!trackId) {
			return
		}

		const track = await getLibraryValue('tracks', trackId, true)
		if (!track) {
			return
		}

		const albumTrackIds = await dbGetAlbumTracksIdsByName(track.album)
		if (albumTrackIds.length > 0) {
			const startIndex = albumTrackIds.indexOf(trackId)
			this.prepareTrack(Math.max(0, startIndex), albumTrackIds)
			return
		}

		this.prepareTrack(0, [trackId])
	}

	ensureActiveMinuteForCurrentTime = (trackId: string, trackTimestampSeconds: number): void => {
		const currentMinuteTimestamp = this.#getActiveMinuteTimestamp(Date.now())
		const isNewMinute =
			!this.currentActiveMinute ||
			this.currentActiveMinute.activeMinuteTimestampMs !== currentMinuteTimestamp

		if (isNewMinute && this.currentActiveMinute) {
			void this.#persistActiveMinute(this.currentActiveMinute)
		}

		const trackTimestampMs = Math.round(trackTimestampSeconds * 1000)
		const playbackRate = this.playbackRate
		if (isNewMinute) {
			this.currentActiveMinute = {
				activeMinuteTimestampMs: currentMinuteTimestamp,
				trackId,
				trackTimestampMs,
				playbackRate,
			}
		} else {
			this.currentActiveMinute = {
				...this.currentActiveMinute,
				trackId,
				trackTimestampMs,
				playbackRate,
			}
		}
	}

	destroyCurrentActiveMinute = (): void => {
		if (this.currentActiveMinute) {
			this.currentActiveMinute = null
		}
	}

	saveTrackTimestamp = (trackId: string, timestampSeconds: number): void => {
		if (!Number.isFinite(this.duration)) {
			return
		}

		if (timestampSeconds <= 5 || timestampSeconds >= this.duration - 10) {
			return
		}

		this.ensureActiveMinuteForCurrentTime(trackId, timestampSeconds)
	}

	getSavedTrackTimestamp = (trackId: string): number => {
		const saved = this.#activeMinutesByTrack.get(trackId)
		if (!saved) {
			return 0
		}
		return saved.trackTimestampMs / 1000
	}

	clearTrackTimestamp = async (trackId: string): Promise<void> => {
		await clearActiveMinutesForTrack(trackId)
		const next = new Map(this.#activeMinutesByTrack)
		next.delete(trackId)
		this.#activeMinutesByTrack = next

		if (this.currentActiveMinute?.trackId === trackId) {
			this.currentActiveMinute = null
		}
	}

	toggleRepeat = (): void => {
		let { repeat } = this

		if (repeat === 'none') {
			repeat = 'all'
		} else if (repeat === 'all') {
			repeat = 'one'
		} else {
			repeat = 'none'
		}

		this.repeat = repeat
	}

	toggleShuffle = (): void => {
		this.shuffle = !this.shuffle

		// Save existing active track id, so after toggling shuffle we can find its new index
		const activeTrackId = this.activeTrack?.id ?? -1
		if (this.shuffle) {
			this.#itemsIdsShuffled = toShuffledArray(this.#itemsIdsOriginalOrder)
			const newIndex = this.#itemsIdsShuffled.indexOf(activeTrackId)
			if (newIndex !== -1) {
				const swappedItemId = this.#itemsIdsShuffled[0] as number
				this.#itemsIdsShuffled[0] = activeTrackId
				this.#itemsIdsShuffled[newIndex] = swappedItemId

				this.#activeTrackIndex = 0
			} else {
				this.#activeTrackIndex = -1
			}
		} else {
			this.#itemsIdsShuffled = null
			this.#activeTrackIndex = this.#itemsIdsOriginalOrder.indexOf(activeTrackId)
		}
	}

	togglePlaybackRate = (): void => {
		const currentIndex = PlayerStore.PLAYBACK_RATES.indexOf(this.playbackRate)
		const nextIndex = (currentIndex + 1) % PlayerStore.PLAYBACK_RATES.length
		this.playbackRate = PlayerStore.PLAYBACK_RATES[nextIndex]
	}

	addToQueue = (trackId: number | number[]): void => {
		if (Array.isArray(trackId)) {
			this.#itemsIdsShuffled?.push(...trackId)
			this.#itemsIdsOriginalOrder.push(...trackId)
		} else {
			this.#itemsIdsShuffled?.push(trackId)
			this.#itemsIdsOriginalOrder.push(trackId)
		}

		if (this.activeTrackIndex === -1) {
			this.#activeTrackIndex = 0
		}
	}

	clearQueue = (): void => {
		this.#itemsIdsOriginalOrder = []
		this.#itemsIdsShuffled = null
		this.#activeTrackIndex = -1
		this.playbackError = null
	}

	destroy = (): void => {
		this.playing = false
		this.playbackError = null
		this.destroyCurrentActiveMinute()
		this.resetAudio()
		releasePlayerAudioOwnership(this.#audio)
		this.#onDatabaseChangeCleanup?.()
		this.#onDatabaseChangeCleanup = null
	}

	resetAudio = (): void => {
		this.#audio.pause()

		if (this.#audio.src) {
			cleanupTrackAudio(this.#audio)
			this.#audio.removeAttribute('src')
			this.#audio.load()
		}

		this.currentTime = 0
		this.duration = 0
		this.loading = false
	}
}
