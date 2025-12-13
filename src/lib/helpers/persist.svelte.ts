const getValue = (key: string) => {
	const valueRaw = localStorage.getItem(key)
	const value = valueRaw === null || valueRaw === undefined ? null : JSON.parse(valueRaw)

	return value
}

export const getPersistedValue = <T>(storeName: string, key: string, defaultValue: T): T => {
	const fullKey = `snaeplayer-${storeName}.${key}`
	const value = getValue(fullKey)

	return value ?? defaultValue
}

export const persist = <T>(storeName: string, instance: T, keys: (keyof T)[]): void => {
	for (const key of keys) {
		invariant(typeof key === 'string', 'Key must be a string')

		const fullKey = `snaeplayer-${storeName}.${key}`

		const value = getValue(fullKey)
		if (value !== null) {
			instance[key] = value
		}

		let initial = true
		$effect.root(() => {
			$effect(() => {
				const updatedValue = instance[key]

				if (initial) {
					initial = false
					return
				}

				localStorage.setItem(fullKey, JSON.stringify(updatedValue))
			})
		})
	}
}
