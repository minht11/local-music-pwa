import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'

const TIME_THRESHOLD_SECONDS = 30
const PERCENT_THRESHOLD = 0.5

export class PlayHistoryTracker {
	#trackId: number | null = null
	#duration = 0
	#maxPlayedTime = 0
	#recorded = false

	begin(trackId: number | null): void {
		this.#finalize()
		this.#trackId = trackId
		this.#duration = 0
		this.#maxPlayedTime = 0
		this.#recorded = false
	}

	/** Called on every time tick during playback. */
	update(currentTime: number, duration: number): void {
		if (duration > 0) {
			this.#duration = duration
		}
		this.#maxPlayedTime = Math.max(this.#maxPlayedTime, currentTime)
		this.#maybeRecord()
	}

	complete(): void {
		this.#maxPlayedTime = this.#duration
		this.#maybeRecord()
		this.#maxPlayedTime = 0
		this.#recorded = false
		this.#trackId = null
		this.#duration = 0
	}

	#maybeRecord(): void {
		if (this.#recorded || this.#trackId === null || this.#duration <= 0) {
			return
		}

		const threshold = Math.min(TIME_THRESHOLD_SECONDS, this.#duration * PERCENT_THRESHOLD)
		if (this.#maxPlayedTime >= threshold) {
			this.#recorded = true
			void dbAddToPlayHistory(this.#trackId)
		}
	}

	#finalize(): void {
		this.#maybeRecord()
		this.#trackId = null
	}
}
