import { logger } from './logger.ts'

// Safe localStorage wrapper that handles quota exceeded and private browsing
const safeLocalStorage = {
	getItem(key: string): string | null {
		try {
			return localStorage.getItem(key)
		} catch (error) {
			logger.warn('Failed to read from localStorage', error, { key })
			return null
		}
	},
	
	setItem(key: string, value: string): boolean {
		try {
			localStorage.setItem(key, value)
			return true
		} catch (error) {
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				logger.warn('localStorage quota exceeded', error, { key })
				// Try to clear some old data
				try {
					const keys = Object.keys(localStorage).filter(k => k.startsWith('snaeplayer-'))
					if (keys.length > 10) {
						// Remove oldest entries (this is a simple strategy)
						keys.slice(0, 5).forEach(k => {
							try {
								localStorage.removeItem(k)
							} catch {}
						})
						// Retry the operation
						localStorage.setItem(key, value)
						return true
					}
				} catch {}
			}
			logger.warn('Failed to write to localStorage', error, { key })
			return false
		}
	}
}

export const persist = <T>(storeName: string, instance: T, keys: (keyof T)[]): void => {
	for (const key of keys) {
		invariant(typeof key === 'string', 'Key must be a string')

		const fullKey = `snaeplayer-${storeName}.${key}`

		try {
			const valueRaw = safeLocalStorage.getItem(fullKey)
			const value = valueRaw === null || valueRaw === undefined ? null : JSON.parse(valueRaw)
			if (value !== null) {
				instance[key] = value
			}
		} catch (error) {
			logger.warn('Failed to parse stored value', error, { storeName, key: String(key) })
		}

		let initial = true
		$effect.root(() => {
			$effect(() => {
				const updatedValue = instance[key]

				if (initial) {
					initial = false
					return
				}

				try {
					const success = safeLocalStorage.setItem(fullKey, JSON.stringify(updatedValue))
					if (!success) {
						logger.warn('Failed to persist value', undefined, { storeName, key: String(key) })
					}
				} catch (error) {
					logger.warn('Failed to serialize value for persistence', error, { storeName, key: String(key) })
				}
			})
		})
	}
}
