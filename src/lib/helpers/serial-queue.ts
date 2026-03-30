/** @public */
export class SerialQueue {
	#chain = Promise.resolve()

	enqueue(promiseFn: () => Promise<void>): Promise<void> {
		const result = this.#chain.then(promiseFn)
		this.#chain = result.catch(() => {})

		return result
	}

	drain(): Promise<void> {
		return this.#chain
	}
}
