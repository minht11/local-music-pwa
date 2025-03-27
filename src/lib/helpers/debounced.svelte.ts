import { debounce } from './utils/debounce'

export type Getter<T> = () => T

export class Debounced<T> {
	#current: T = $state() as T

	get current(): T {
		return this.#current
	}

	constructor(getter: Getter<T>, delay: number) {
		this.#current = getter()

		const debouncedFn = debounce((v: T) => {
			this.#current = v
		}, delay)

		$effect(() => {
			const value = getter()
			debouncedFn(value)
		})
	}
}
