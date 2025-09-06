import { formatArtists } from '$lib/helpers/utils/text.ts'
import { ytmStore } from '$lib/services/ytm-api'
import type { YTMTrack, YTMPlaylist } from '$lib/services/ytm-api'
import { extractColorFromImageUrl } from '$lib/helpers/extract-artwork-color.ts'

export type PlayerRepeat = 'none' | 'one' | 'all'

// Utility function to get the highest quality thumbnail from YTM thumbnails array
function getHighestQualityThumbnail(thumbnails?: Array<{ url: string; width?: number; height?: number }>): string {
	if (!thumbnails || thumbnails.length === 0) return ''
	
	const highestQuality = thumbnails.reduce((best, current) => {
		const bestSize = (best.width || 0) * (best.height || 0)
		const currentSize = (current.width || 0) * (current.height || 0)
		return currentSize > bestSize ? current : best
	}, thumbnails[0])
	
	return highestQuality.url
}

export class YTMPlayerStore {
	#volume = $state(100)
	#shuffleState = $state(false) // Track shuffle state client-side since API doesn't provide it
	#currentTrackWithColor = $state<YTMTrack | null>(null) // Cache current track with extracted color

	get volume() {
		return this.#volume
	}

	set volume(value: number) {
		this.#volume = value
		// Sync with YTM
		if (ytmStore.isConnected) {
			ytmStore.setVolume(value)
		}
	}

	muted: boolean = $state(false)

	// YTM-derived properties
	get playing(): boolean {
		return ytmStore.state?.player?.trackState === 1
	}

	get currentTime(): number {
		return ytmStore.state?.player?.videoProgress || 0
	}

	get duration(): number {
		return ytmStore.state?.video?.durationSeconds || 0
	}

	get activeTrack(): YTMTrack | null {
		const state = ytmStore.state
		if (!state?.video) return null
		
		const thumbnailUrl = getHighestQualityThumbnail(state.video.thumbnails)
		const basicTrack: YTMTrack = {
			title: state.video.title,
			artists: [state.video.author],
			album: state.video.album,
			duration: state.video.durationSeconds,
			thumbnail: thumbnailUrl,
			id: state.video.id,
			url: `https://music.youtube.com/watch?v=${state.video.id}`
		}
		
		// If we have a cached track with the same ID and thumbnail, return it (with color)
		if (this.#currentTrackWithColor?.id === basicTrack.id && 
		    this.#currentTrackWithColor?.thumbnail === basicTrack.thumbnail) {
			return this.#currentTrackWithColor
		}
		
		// Otherwise, start color extraction in the background and return basic track for now
		this.#extractColorForTrack(basicTrack)
		return basicTrack
	}
	
	async #extractColorForTrack(track: YTMTrack): Promise<void> {
		if (!track.thumbnail) return
		
		try {
			const primaryColor = await extractColorFromImageUrl(track.thumbnail)
			
			// Only update if this is still the current track
			if (ytmStore.state?.video?.id === track.id) {
				this.#currentTrackWithColor = {
					...track,
					primaryColor
				}
			}
		} catch (error) {
			console.warn('Failed to extract color for track:', track.title, error)
		}
	}

	get queue(): YTMTrack[] {
		const queueItems = ytmStore.state?.player?.queue?.items || []
		return queueItems.map(item => ({
			title: item.title,
			artists: [item.author],
			album: '', // Queue items don't have album info
			duration: 0, // Duration is string format, would need parsing
			thumbnail: getHighestQualityThumbnail(item.thumbnails),
			id: item.videoId,
			url: `https://music.youtube.com/watch?v=${item.videoId}`
		}))
	}

	get shuffle(): boolean {
		// Use client-side tracked state since YTM API doesn't provide shuffle state
		return this.#shuffleState
	}

	get repeat(): PlayerRepeat {
		const ytmRepeatMode = ytmStore.state?.player?.queue?.repeatMode
		switch (ytmRepeatMode) {
			case 0: return 'none'  // No repeat
			case 1: return 'all'   // Repeat all
			case 2: return 'one'   // Repeat one
			default: return 'none'
		}
	}

	get isQueueEmpty(): boolean {
		return this.queue.length === 0
	}

	get activeTrackIndex(): number {
		return ytmStore.state?.player?.queue?.selectedItemIndex || 0
	}

	get artworkSrc(): string | undefined {
		const thumbnailUrl = getHighestQualityThumbnail(ytmStore.state?.video?.thumbnails)
		return thumbnailUrl || undefined
	}

	get isConnected(): boolean {
		return ytmStore.isConnected
	}

	get connectionError(): string | null {
		return ytmStore.lastError
	}

	get userPlaylists(): YTMPlaylist[] {
		return ytmStore.userPlaylists
	}

	constructor() {
		console.log('[YTMPlayer] Initializing YTM Player Store...')
		// Auto-connect to YTM Desktop on startup
		this.autoConnect()

		// Set up Media Session API
		const ms = window.navigator.mediaSession

		$effect(() => {
			const track = this.activeTrack

			if (!track) {
				ms.metadata = null
				return
			}

			ms.metadata = new MediaMetadata({
				title: track.title,
				artist: track.artists.join(', '),
				album: track.album || 'Unknown Album',
				artwork: track.thumbnail ? [
					{
						src: track.thumbnail,
						sizes: '512x512',
						type: 'image/jpeg',
					},
				] : [
					{
						src: new URL('/artwork.svg', location.origin).toString(),
						sizes: '512x512',
						type: 'image/svg+xml',
					}
				],
			})
		})

		// Media session handlers
		const setActionHandler = ms.setActionHandler.bind(ms)
		setActionHandler('play', () => this.togglePlay(true))
		setActionHandler('pause', () => this.togglePlay(false))
		setActionHandler('previoustrack', this.playPrev)
		setActionHandler('nexttrack', this.playNext)
		setActionHandler('seekbackward', () => {
			const newPosition = Math.max(this.currentTime - 10, 0)
			this.seek(newPosition)
		})
		setActionHandler('seekforward', () => {
			const newPosition = Math.min(this.currentTime + 10, this.duration)
			this.seek(newPosition)
		})

		// Sync volume changes
		$effect(() => {
			const ytmVolume = ytmStore.state?.player?.volume
			if (ytmVolume !== undefined && ytmVolume !== this.#volume) {
				this.#volume = ytmVolume
			}
		})
	}

	togglePlay = async (force?: boolean): Promise<void> => {
		if (!ytmStore.isConnected) {
			console.warn('Not connected to YouTube Music Desktop')
			return
		}

		// If force is specified, we need to check current state
		if (force !== undefined) {
			const shouldPlay = force
			const isCurrentlyPlaying = this.playing
			
			// Only toggle if the desired state is different from current state
			if (shouldPlay !== isCurrentlyPlaying) {
				await ytmStore.togglePlayPause()
			}
		} else {
			// No force specified, just toggle
			await ytmStore.togglePlayPause()
		}
	}

	playNext = async (): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.next()
	}

	playPrev = async (): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.previous()
	}

	seek = async (time: number): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.seek(time)
	}

	playTrackAtIndex = async (index: number): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.playTrackAtIndex(index)
	}

	toggleRepeat = async (): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.toggleRepeat()
	}

	toggleShuffle = async (): Promise<void> => {
		if (!ytmStore.isConnected) return
		// Toggle client-side state first for immediate UI feedback
		this.#shuffleState = !this.#shuffleState
		// Then send command to YTM
		await ytmStore.toggleShuffle()
	}

	setVolume = async (volume: number): Promise<void> => {
		this.volume = volume
	}

	likeTrack = async (): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.likeTrack()
	}

	loadPlaylist = async (playlistId: string): Promise<void> => {
		if (!ytmStore.isConnected) return
		await ytmStore.loadPlaylist(playlistId)
	}

	get isLiked(): boolean {
		// Get like status from current track (2 = liked, 1 = disliked, 0 = neutral)
		return ytmStore.state?.video?.likeStatus === 2
	}

	// Auto-connect on startup
	private async autoConnect(): Promise<void> {
		console.log('[YTMPlayer] Starting auto-connect...')
		// Check if there's an existing connection stored
		const existingConnection = ytmStore.getCurrentConnection()
		
		console.log('[YTMPlayer] Checking existing connection:', existingConnection)
		
		if (existingConnection?.token) {
			console.log('[YTMPlayer] Found existing token, attempting reconnect...')
			// Try to reconnect with existing credentials
			await ytmStore.connect(existingConnection.host, existingConnection.port)
		} else {
			console.log('[YTMPlayer] No existing token, trying default connection...')
			// Try to connect to default YTM Desktop instance
			await ytmStore.connect('127.0.0.1', 9863)
		}
	}

	// Connection management
	async connect(host = '127.0.0.1', port = 9863): Promise<boolean> {
		return ytmStore.connect(host, port)
	}

	async disconnect(): Promise<void> {
		return ytmStore.disconnect()
	}

	resetConnection(): void {
		ytmStore.resetConnection()
	}

	async forceReconnect(): Promise<boolean> {
		return ytmStore.forceReconnect()
	}

	// Legacy compatibility methods (for existing UI)
	playTrack = (): void => {
		console.warn('playTrack not implemented for YTM - use YTM Desktop interface to select tracks')
	}

	addToQueue = (): void => {
		console.warn('addToQueue not implemented for YTM - use YTM Desktop interface to manage queue')
	}

	clearQueue = (): void => {
		console.warn('clearQueue not implemented for YTM - use YTM Desktop interface to manage queue')
	}

	reset = (): void => {
		// Nothing to reset for YTM player
	}
}