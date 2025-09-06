import { YTMAPIClient } from './client.js'
import type { YTMPlayerState, YTMPlaylist, YTMConnection, YTMTrack } from './types.js'
import { logger } from '$lib/helpers/logger.ts'

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

class YTMStore {
	private client = new YTMAPIClient()
	private playerState = $state<YTMPlayerState | null>(null)
	private playlists = $state<YTMPlaylist[]>([])
	private connected = $state(false)
	private connecting = $state(false)
	private error = $state<string | null>(null)

	constructor() {
		const connection = this.client.getCurrentConnection()
		if (connection?.token) {
			this.connected = connection.connected || false
		}
	}

	get state(): YTMPlayerState | null {
		return this.playerState
	}

	get userPlaylists(): YTMPlaylist[] {
		return this.playlists
	}

	get isConnected(): boolean {
		return this.connected
	}

	get isConnecting(): boolean {
		return this.connecting
	}

	get lastError(): string | null {
		return this.error
	}

	get currentTrack(): YTMTrack | null {
		const state = this.playerState
		if (!state?.video) return null
		
		return {
			title: state.video.title,
			artists: [state.video.author],
			album: state.video.album,
			duration: state.video.durationSeconds,
			thumbnail: getHighestQualityThumbnail(state.video.thumbnails),
			id: state.video.id,
			url: `https://music.youtube.com/watch?v=${state.video.id}`
		}
	}

	get isPlaying(): boolean {
		return this.playerState?.player?.trackState === 1
	}

	get volume(): number {
		return this.playerState?.player?.volume || 0
	}

	get progress(): number {
		return this.playerState?.player?.videoProgress || 0
	}

	get queue(): YTMTrack[] {
		return this.playerState?.player?.queue?.items || []
	}

	async connect(host = '127.0.0.1', port = 9863): Promise<boolean> {
		logger.ytm.info(`Attempting to connect to ${host}:${port}`)
		this.connecting = true
		this.error = null

		try {
			// First, test if YTM Desktop is running by trying to reach the API
			logger.ytm.debug('Testing if YTM Desktop is reachable...', { host, port })
			const testResponse = await fetch(`http://${host}:${port}/api/v1/state`, {
				method: 'HEAD',
				mode: 'cors'
			}).catch(e => {
				logger.ytm.error('YTM Desktop not reachable', e, { host, port })
				throw new Error(`YouTube Music Desktop is not running or not accessible at ${host}:${port}. Please ensure YTM Desktop is installed, running, and has the "Remote Control API" enabled in Settings → Integrations.`)
			})

			logger.ytm.debug('YTM Desktop is reachable', { host, port })

			// First try to connect with existing token if available
			const existingConnection = this.client.getCurrentConnection()
			logger.ytm.debug('Checking existing connection', { existingConnection })
			
			if (existingConnection?.token && existingConnection.host === host && existingConnection.port === port) {
				logger.ytm.debug('Using existing token, testing validity...')
				try {
					// Test if existing token is still valid
					await this.client.getPlayerState()
					logger.ytm.info('Existing token is valid, connecting socket...')
					await this.connectSocket()
					this.connecting = false
					return true
				} catch (tokenError) {
					logger.ytm.warn('Existing token is invalid, clearing and requesting new auth...', tokenError)
					this.client.clearConnection()
				}
			}

			logger.ytm.info('Requesting new auth code...')
			// Request authentication
			const code = await this.client.requestAuthCode({
				appId: 'local-music-pwa',
				appName: 'Local Music PWA',
				appVersion: '1.0.0'
			}, host, port)

			logger.ytm.info(`Auth code received: ${code}. Please approve the connection in YouTube Music Desktop within 30 seconds.`)

			// Give user time to approve (API docs say 30 seconds, but we'll give a bit more time)
			logger.ytm.debug('Waiting 5 seconds for user to approve...')
			await new Promise(resolve => setTimeout(resolve, 5000))

			logger.ytm.debug('Exchanging code for token...')
			const token = await this.client.exchangeToken({
				appId: 'local-music-pwa',
				code
			}, host, port)

			logger.ytm.info('Token received, connecting socket...')
			await this.connectSocket()
			await this.loadInitialData()

			this.connecting = false
			logger.ytm.info('Connection successful!')
			return true
		} catch (error) {
			logger.ytm.error('Connection failed', error)
			this.error = error instanceof Error ? error.message : 'Connection failed'
			this.connecting = false
			return false
		}
	}

	private async connectSocket(): Promise<void> {
		this.client.connectSocket(
			(state: YTMPlayerState) => {
				this.playerState = state
			},
			(connected: boolean) => {
				logger.ytm.debug('Connection status changed', { connected })
				this.connected = connected
				if (!connected) {
					this.error = 'Lost connection to YouTube Music Desktop'
				} else {
					// When socket connects, load playlists and wait for state updates
					logger.ytm.info('Socket connected, loading initial data...')
					this.loadInitialData()
				}
			}
		)

		// Wait a moment for connection to establish
		await new Promise(resolve => setTimeout(resolve, 1000))
	}

	private async loadInitialData(): Promise<void> {
		try {
			console.log('[YTM Store] Loading initial data...')
			// Only load playlists via REST API, state will come via socket
			const playlists = await this.client.getPlaylists()

			console.log('[YTM Store] Received playlists:', playlists)
			this.playlists = playlists
			
			// State will be updated via Socket.IO 'state-update' events
			console.log('[YTM Store] Initial data loaded, waiting for state updates via socket...')
		} catch (error) {
			console.error('[YTM Store] Failed to load initial data:', error)
			this.error = error instanceof Error ? error.message : 'Failed to load data'
		}
	}

	async disconnect(): Promise<void> {
		this.client.disconnect()
		this.connected = false
		this.playerState = null
		this.playlists = []
	}

	resetConnection(): void {
		console.log('[YTM Store] Resetting connection...')
		this.client.clearConnection()
		this.connected = false
		this.connecting = false
		this.error = null
		this.playerState = null
		this.playlists = []
	}

	async forceReconnect(): Promise<boolean> {
		console.log('[YTM Store] Force reconnecting...')
		this.resetConnection()
		// Try to reconnect to default
		return await this.connect('127.0.0.1', 9863)
	}

	async play(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('playPause')
	}

	async pause(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('playPause')
	}

	async togglePlayPause(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('playPause')
	}

	async next(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('next')
	}

	async previous(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('previous')
	}

	async setVolume(volume: number): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('setVolume', volume)
	}

	async seek(position: number): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('seekTo', position)
	}

	async playTrackAtIndex(index: number): Promise<void> {
		if (!this.connected) return
		console.log(`[YTM Store] Playing track at index: ${index}`)
		await this.client.sendCommand('playQueueIndex', index)
	}

	async likeTrack(): Promise<void> {
		if (!this.connected) return
		console.log('[YTM Store] Toggling like for track')
		await this.client.sendCommand('toggleLike')
	}

	async loadPlaylist(playlistId: string): Promise<void> {
		if (!this.connected) return
		console.log(`[YTM Store] Loading playlist: ${playlistId}`)
		// Use the correct YTM API command to load a playlist
		await this.client.sendCommand('changeVideo', { playlistId })
	}

	async toggleShuffle(): Promise<void> {
		if (!this.connected) return
		await this.client.sendCommand('shuffle')
	}

	async toggleRepeat(): Promise<void> {
		if (!this.connected) return
		// Based on working code, repeat cycles through modes 0,1,2
		const currentMode = this.playerState?.player?.queue?.repeatMode || 0
		const nextMode = (currentMode + 1) % 3
		await this.client.sendCommand('repeatMode', nextMode)
	}

	getCurrentConnection(): YTMConnection | null {
		return this.client.getCurrentConnection()
	}

	setConnection(connection: YTMConnection): void {
		this.client.setConnection(connection)
	}
}

export const ytmStore = new YTMStore()