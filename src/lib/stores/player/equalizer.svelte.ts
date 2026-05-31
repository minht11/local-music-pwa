import type { AudioGraph } from '$lib/audio/audio-graph.svelte.ts'
import { persist } from '$lib/helpers/persist.svelte.ts'

export type BuiltinEqPresetKey =
	| 'flat'
	| 'bassBoost'
	| 'trebleBoost'
	| 'rock'
	| 'pop'
	| 'jazz'
	| 'classical'
	| 'electronic'
	| 'acoustic'

const EQ_PRESET_GAINS: Record<BuiltinEqPresetKey, readonly number[]> = {
	flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	bassBoost: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
	trebleBoost: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6],
	rock: [4, 3, 1, 0, -1, 0, 1, 3, 4, 4],
	pop: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
	jazz: [3, 2, 0, 0, 1, 2, 2, 1, 2, 3],
	classical: [0, 0, 0, 1, 2, 2, 1, 2, 3, 4],
	electronic: [5, 4, 2, 0, 1, 2, 1, 3, 4, 4],
	acoustic: [2, 1, 0, 1, 2, 2, 1, 2, 2, 1],
}

/**
 * Manages the EQ band gain values and syncs them to AudioGraph's filter nodes.
 */
export class EqualizerStore {
	readonly #graph: AudioGraph

	enabled: boolean = $state(false)
	bands: number[] = $state([...EQ_PRESET_GAINS.flat])
	selectedPreset: BuiltinEqPresetKey | null = $state('flat')

	constructor(graph: AudioGraph) {
		this.#graph = graph
		persist('equalizer', this, ['enabled', 'bands', 'selectedPreset'])

		this.#setupFiltersEffect()
	}

	#setupFiltersEffect(): void {
		$effect(() => {
			if (!this.#graph.initialized) {
				return
			}

			const enabled = this.enabled
			const bands = this.bands
			const filters = this.#graph.filters

			invariant(filters.length === bands.length)

			for (const [i, filter] of filters.entries()) {
				const targetGain = enabled ? (bands[i] ?? 0) : 0
				filter.gain.setTargetAtTime(targetGain, this.#graph.context.currentTime, 0.015)
			}
		})
	}

	setBand(index: number, gain: number): void {
		this.bands[index] = gain
		this.selectedPreset = null
	}

	applyPreset(name: BuiltinEqPresetKey): void {
		this.bands = [...EQ_PRESET_GAINS[name]]
		this.selectedPreset = name
	}

	reset(): void {
		this.applyPreset('flat')
	}
}
