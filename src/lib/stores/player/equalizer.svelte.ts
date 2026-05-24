import type { AudioGraph } from '$lib/audio/audio-graph.ts'
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
 *
 * The AudioGraph owns the BiquadFilterNodes. EqualizerStore only controls
 * their gain values — it has no knowledge of engines or connections.
 */
export class EqualizerStore {
	readonly #graph: AudioGraph

	enabled: boolean = $state(false)
	bands: number[] = $state([...EQ_PRESET_GAINS.flat])
	selectedPreset: BuiltinEqPresetKey | null = $state('flat')

	constructor(graph: AudioGraph) {
		this.#graph = graph
	}

	init(): void {
		persist('equalizer', this, ['enabled', 'bands', 'selectedPreset'])

		$effect(() => {
			const enabled = this.enabled
			const bands = this.bands
			const filters = this.#graph.filters

			if (!this.#graph.initialized) {
				return
			}

			invariant(filters.length === bands.length)

			for (const [i, filter] of filters.entries()) {
				filter.gain.value = enabled ? (bands[i] ?? 0) : 0
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
