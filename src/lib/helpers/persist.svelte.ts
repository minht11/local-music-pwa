const getValue = (key: string) => {
	try {
		const valueRaw = localStorage.getItem(key)
		const value = valueRaw === null || valueRaw === undefined ? null : JSON.parse(valueRaw)

		return value
	} catch (error) {
		console.error(`Failed to get persisted value for key "${key}"`, error)

		return null
	}
}

const getFullKey = (storeName: string, key: string) => `snaeplayer-${storeName}.${key}`

export const getPersistedValue = <T, D = null>(
	storeName: string,
	key: string,
	defaultValue: D = null as D,
): T | D => {
	const fullKey = getFullKey(storeName, key)
	const value = getValue(fullKey)

	return value ?? defaultValue
}

export const persist = <T>(storeName: string, instance: T, keys: (keyof T & string)[]): void => {
	for (const key of keys) {
		const fullKey = getFullKey(storeName, key)

		const value = getValue(fullKey)
		if (value !== null) {
			instance[key] = value
		}

		let initial = true
		// TODO. Move effect root once per all keys
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
