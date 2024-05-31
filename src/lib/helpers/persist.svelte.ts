import invariant from 'tiny-invariant'

export const persist = <T>(storeName: string, instance: T, keys: (keyof T)[]): void => {
	for (const key of keys) {
		invariant(typeof key === 'string', 'Key must be a string')

		const fullKey = `snaeplayer-${storeName}.${key}`

		const valueRaw = localStorage.getItem(fullKey)
		const value = valueRaw === null || valueRaw === undefined ? null : JSON.parse(valueRaw)
		if (value !== null) {
			instance[key] = value
		}

		let initial = true
		$effect(() => {
			const updatedValue = instance[key]

			if (initial) {
				initial = false
				return
			}

			localStorage.setItem(fullKey, JSON.stringify(updatedValue))
		})
	}
}
