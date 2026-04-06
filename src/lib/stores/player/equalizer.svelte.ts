import { persist } from '$lib/helpers/persist.svelte.ts'

export const EQ_BANDS = [
	{ frequency: 32, label: '32 Hz' },
	{ frequency: 64, label: '64 Hz' },
	{ frequency: 125, label: '125 Hz' },
	{ frequency: 250, label: '250 Hz' },
	{ frequency: 500, label: '500 Hz' },
	{ frequency: 1000, label: '1 kHz' },
	{ frequency: 2000, label: '2 kHz' },
	{ frequency: 4000, label: '4 kHz' },
	{ frequency: 8000, label: '8 kHz' },
	{ frequency: 16_000, label: '16 kHz' },
] as const

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

export const EQ_MIN_GAIN = -12
export const EQ_MAX_GAIN = 12

export class EqualizerStore {
	enabled: boolean = $state(false)
	bands: number[] = $state([...EQ_PRESET_GAINS.flat])
	selectedPreset: BuiltinEqPresetKey | null = $state('flat')

	readonly #audio: HTMLAudioElement
	#audioContext: AudioContext | null = null
	#filters: BiquadFilterNode[] = []

	constructor(audio: HTMLAudioElement) {
		this.#audio = audio
	}

	init = (): void => {
		persist('equalizer', this, ['enabled', 'bands', 'selectedPreset'])

		$effect(() => {
			const enabled = this.enabled
			const bands = this.bands
			if (this.#filters.length === 0) {
				return
			}

			invariant(this.#filters.length === bands.length)

			for (const [index, filter] of this.#filters.entries()) {
				filter.gain.value = enabled ? (bands[index] ?? 0) : 0
			}
		})
	}

	#ensureAudioGraph = (): AudioContext => {
		if (this.#audioContext !== null) {
			return this.#audioContext
		}

		const audioContext = new AudioContext()
		const filters = EQ_BANDS.map(({ frequency }) => {
			const filter = audioContext.createBiquadFilter()
			filter.type = 'peaking'
			filter.frequency.value = frequency
			filter.Q.value = 1.41
			filter.gain.value = 0

			return filter
		})

		const source = audioContext.createMediaElementSource(this.#audio)

		// Chain filters
		let node: AudioNode = source
		for (const filter of filters) {
			node.connect(filter)
			node = filter
		}
		node.connect(audioContext.destination)

		this.#audioContext = audioContext
		this.#filters = filters

		return audioContext
	}

	resumeContext = (): Promise<void> => {
		const audioContext = this.#ensureAudioGraph()
		if (audioContext.state === 'suspended') {
			return audioContext.resume()
		}

		return Promise.resolve()
	}

	setBand = (index: number, gain: number): void => {
		this.bands[index] = gain
		this.selectedPreset = null
	}

	applyPreset = (name: BuiltinEqPresetKey): void => {
		this.bands = [...EQ_PRESET_GAINS[name]]
		this.selectedPreset = name
	}

	reset = (): void => {
		this.applyPreset('flat')
	}
}
