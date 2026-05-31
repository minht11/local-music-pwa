import { EQ_BANDS } from './eq-bands.ts'

/**
 * Owns the AudioContext and the EQ filter chain.
 * Multiple engines connect their GainNodes to `inputNode`.
 *
 *   engineA.gainNode ─┐
 *                      ├─→ inputNode → filter[0] → … → filter[9] → destination
 *   engineB.gainNode ─┘
 */
export class AudioGraph {
	#context: AudioContext | null = $state(null)
	#inputNode: GainNode | null = null
	#volumeNode: GainNode | null = null
	#filters: BiquadFilterNode[] = []

	/**
	 * Lazily creates the AudioContext on first access.
	 * Must be called from a user-gesture handler on first use.
	 */
	get context(): AudioContext {
		return this.#ensureGraph()
	}

	get initialized(): boolean {
		return this.#context !== null
	}

	get inputNode(): GainNode {
		this.#ensureGraph()
		invariant(this.#inputNode, 'AudioGraph input node should be initialized')

		return this.#inputNode
	}

	/**
	 * The EQ filter nodes, exposed for EqualizerStore to control gain.
	 * Indices correspond 1:1 with EQ_BANDS.
	 */
	get filters(): readonly BiquadFilterNode[] {
		this.#ensureGraph()
		return this.#filters
	}

	#ensureGraph(): AudioContext {
		if (this.#context) {
			return this.#context
		}

		const ctx = new AudioContext()

		const filters = EQ_BANDS.map(({ frequency }) => {
			const filter = ctx.createBiquadFilter()
			filter.type = 'peaking'
			filter.frequency.value = frequency
			filter.Q.value = 1.41
			filter.gain.value = 0
			return filter
		})

		// A GainNode as the mixer/entry point keeps inputNode
		// semantically distinct from the first EQ filter.
		const inputNode = ctx.createGain()

		let node: AudioNode = inputNode
		for (const filter of filters) {
			node.connect(filter)
			node = filter
		}
		const volumeNode = ctx.createGain()
		node.connect(volumeNode)
		volumeNode.connect(ctx.destination)

		this.#context = ctx
		this.#inputNode = inputNode
		this.#volumeNode = volumeNode
		this.#filters = filters

		return ctx
	}

	setVolume(normalized: number): void {
		if (this.#volumeNode && this.#context) {
			this.#volumeNode.gain.setTargetAtTime(normalized, this.#context.currentTime, 0.015)
		}
	}

	resume(): Promise<void> {
		if (this.#context?.state !== 'suspended') {
			return Promise.resolve()
		}

		return this.#context.resume()
	}

	suspend(): Promise<void> {
		if (this.#context?.state !== 'running') {
			return Promise.resolve()
		}

		return this.#context.suspend()
	}

	dispose(): void {
		if (this.#context) {
			this.#context.close()
		}
		this.#context = null
		this.#inputNode = null
		this.#volumeNode = null
		this.#filters = []
	}
}
