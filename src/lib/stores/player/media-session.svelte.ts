import { formatArtists, formatNameOrUnknown } from '$lib/helpers/utils/text'
import type { TrackData } from '$lib/library/get/value'

interface PlayerImpl {
	activeTrack: TrackData | undefined
	artworkSrc: string | undefined
	playing: boolean
	currentTime: number
	duration: number
	playbackRate: number
	play: () => void
	pause: () => void
	seek: (time: number) => void
	playNext: () => void
	playPrev: () => void
}

export class MediaSessionController {
	#player: PlayerImpl

	constructor(player: PlayerImpl) {
		this.#player = player

		const ms = navigator.mediaSession
		if (!ms) {
			return
		}

		const setAction = ms.setActionHandler.bind(ms)

		setAction('play', () => player.play())
		setAction('pause', () => player.pause())
		setAction('nexttrack', () => player.playNext())
		setAction('previoustrack', () => player.playPrev())
		setAction('seekbackward', (s) => {
			const offset = s.seekOffset ?? 10
			player.seek(Math.max(player.currentTime - offset, 0))
		})
		setAction('seekforward', (s) => {
			const offset = s.seekOffset ?? 10

			player.seek(Math.min(player.currentTime + offset, player.duration))
		})
		setAction('seekto', ({ seekTime }) => {
			if (seekTime != null) {
				player.seek(seekTime)
			}
		})

		$effect(() => {
			ms.playbackState = player.playing ? 'playing' : 'paused'
		})

		$effect(() => {
			const { duration } = player
			// setPositionState throws otherwise
			if (duration <= 0) {
				return
			}

			// We only want to update on every tick, to allow scrubbing, browser interpolates position itself.
			this.updatePosition(untrack(() => player.currentTime))
		})

		$effect(() => {
			const track = player.activeTrack
			if (!track) {
				ms.metadata = null
				return
			}

			const fallbackArtworkSrc = new URL('/artwork.svg', location.origin).toString()
			ms.metadata = new MediaMetadata({
				title: track.name,
				artist: formatArtists(track.artists),
				album: formatNameOrUnknown(track.album),
				artwork: [
					{
						src: player.artworkSrc ?? fallbackArtworkSrc,
					},
				],
			})
		})
	}

	updatePosition(currentTime: number): void {
		if (!navigator.mediaSession) {
			return
		}

		const { duration } = this.#player
		// setPositionState throws otherwise
		if (duration <= 0) {
			return
		}

		navigator.mediaSession.setPositionState({
			duration,
			playbackRate: this.#player.playbackRate,
			position: Math.min(currentTime, duration),
		})
	}
}
