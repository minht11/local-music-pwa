import { PlayerStore } from './player.svelte.ts'
import { YTMPlayerStore } from './ytm-player.svelte.ts'
import { ytmStore } from '$lib/services/ytm-api'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { YTMTrack } from '$lib/services/ytm-api'
import type { PlayTrackOptions } from './player.svelte.ts'

export type PlayerMode = 'local' | 'ytm'

export class UnifiedPlayerStore {
	private localPlayer = new PlayerStore()
	private ytmPlayer = new YTMPlayerStore()
	private _mode = $state<PlayerMode>('local')

	get mode(): PlayerMode {
		return this._mode
	}

	set mode(value: PlayerMode) {
		this._mode = value
	}

	// Auto-switch to YTM mode when connected
	constructor() {
		$effect(() => {
			if (ytmStore.isConnected && this._mode === 'local') {
				this._mode = 'ytm'
			} else if (!ytmStore.isConnected && this._mode === 'ytm') {
				this._mode = 'local'
			}
		})
	}

	// Proxy all player properties and methods to the active player
	get playing(): boolean {
		return this._mode === 'ytm' ? this.ytmPlayer.playing : this.localPlayer.playing
	}

	get currentTime(): number {
		return this._mode === 'ytm' ? this.ytmPlayer.currentTime : this.localPlayer.currentTime
	}

	get duration(): number {
		return this._mode === 'ytm' ? this.ytmPlayer.duration : this.localPlayer.duration
	}

	get volume(): number {
		return this._mode === 'ytm' ? this.ytmPlayer.volume : this.localPlayer.volume
	}

	set volume(value: number) {
		if (this._mode === 'ytm') {
			this.ytmPlayer.volume = value
		} else {
			this.localPlayer.volume = value
		}
	}

	get muted(): boolean {
		return this._mode === 'ytm' ? this.ytmPlayer.muted : this.localPlayer.muted
	}

	set muted(value: boolean) {
		if (this._mode === 'ytm') {
			this.ytmPlayer.muted = value
		} else {
			this.localPlayer.muted = value
		}
	}

	get shuffle(): boolean {
		return this._mode === 'ytm' ? this.ytmPlayer.shuffle : this.localPlayer.shuffle
	}

	get repeat(): 'none' | 'one' | 'all' {
		return this._mode === 'ytm' ? this.ytmPlayer.repeat : this.localPlayer.repeat
	}

	get isQueueEmpty(): boolean {
		return this._mode === 'ytm' ? this.ytmPlayer.isQueueEmpty : this.localPlayer.isQueueEmpty
	}

	get activeTrackIndex(): number {
		return this._mode === 'ytm' ? this.ytmPlayer.activeTrackIndex : this.localPlayer.activeTrackIndex
	}

	get artworkSrc(): string | undefined {
		return this._mode === 'ytm' ? this.ytmPlayer.artworkSrc : this.localPlayer.artworkSrc
	}

	// For compatibility with existing UI - return type that works with both
	get activeTrack(): TrackData | YTMTrack | undefined {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.activeTrack
		}
		return this.localPlayer.activeTrack
	}

	get queue(): (TrackData | YTMTrack)[] {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.queue
		}
		return []
	}

	get itemsIds(): readonly number[] {
		if (this._mode === 'local') {
			return this.localPlayer.itemsIds
		}
		return []
	}

	// Player control methods
	async togglePlay(force?: boolean): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.togglePlay(force)
		}
		return this.localPlayer.togglePlay(force)
	}

	async playNext(): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.playNext()
		}
		return this.localPlayer.playNext()
	}

	async playPrev(): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.playPrev()
		}
		return this.localPlayer.playPrev()
	}

	async seek(time: number): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.seek(time)
		}
		return this.localPlayer.seek(time)
	}

	async toggleRepeat(): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.toggleRepeat()
		}
		return this.localPlayer.toggleRepeat()
	}

	async toggleShuffle(): Promise<void> {
		if (this._mode === 'ytm') {
			return this.ytmPlayer.toggleShuffle()
		}
		return this.localPlayer.toggleShuffle()
	}

	// Local-only methods (with YTM warnings)
	playTrack(trackIndex: number, queue?: readonly number[], options?: PlayTrackOptions): void {
		if (this._mode === 'ytm') {
			console.warn('playTrack not supported in YTM mode - use YouTube Music Desktop to select tracks')
			return
		}
		return this.localPlayer.playTrack(trackIndex, queue, options ?? {})
	}

	addToQueue(trackId: number | number[]): void {
		if (this._mode === 'ytm') {
			console.warn('addToQueue not supported in YTM mode - use YouTube Music Desktop to manage queue')
			return
		}
		return this.localPlayer.addToQueue(trackId)
	}

	clearQueue(): void {
		if (this._mode === 'ytm') {
			console.warn('clearQueue not supported in YTM mode - use YouTube Music Desktop to manage queue')
			return
		}
		return this.localPlayer.clearQueue()
	}

	reset(): void {
		if (this._mode === 'local') {
			this.localPlayer.reset()
		}
		// YTM player doesn't need reset
	}

	// Connection management for YTM
	async connectToYTM(host = '127.0.0.1', port = 9863): Promise<boolean> {
		const success = await this.ytmPlayer.connect(host, port)
		if (success) {
			this._mode = 'ytm'
		}
		return success
	}

	async disconnectFromYTM(): Promise<void> {
		await this.ytmPlayer.disconnect()
		this._mode = 'local'
	}

	get isYTMConnected(): boolean {
		return this.ytmPlayer.isConnected
	}

	get ytmConnectionError(): string | null {
		return this.ytmPlayer.connectionError
	}
}