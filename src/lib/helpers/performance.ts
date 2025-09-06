/**
 * Performance monitoring and optimization utilities
 */

import { logger } from './logger.ts'

// Memory usage monitoring (development only)
export const monitorMemoryUsage = () => {
	if (!import.meta.env.DEV || typeof window === 'undefined' || !('performance' in window)) {
		return
	}

	const checkMemory = () => {
		if ('memory' in performance) {
			const memory = (performance as any).memory
			const used = Math.round(memory.usedJSHeapSize / 1048576)
			const total = Math.round(memory.totalJSHeapSize / 1048576)
			const limit = Math.round(memory.jsHeapSizeLimit / 1048576)

			if (used / limit > 0.8) {
				logger.warn('High memory usage detected', undefined, {
					used: `${used}MB`,
					total: `${total}MB`,
					limit: `${limit}MB`,
					percentage: `${Math.round((used / limit) * 100)}%`
				})
			}
		}
	}

	// Check memory every 30 seconds in development
	setInterval(checkMemory, 30000)
}

// Report web vitals for performance monitoring
export const reportWebVitals = (metric: any) => {
	if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_ANALYTICS) {
		// Log critical web vitals
		if (['CLS', 'FID', 'FCP', 'LCP', 'TTFB'].includes(metric.name)) {
			logger.info('Web Vital', {
				name: metric.name,
				value: metric.value,
				rating: metric.rating
			})
		}
	}
}

// Debounce utility for performance optimization
export const debounce = <T extends (...args: any[]) => void>(
	func: T,
	wait: number,
	immediate = false
): ((...args: Parameters<T>) => void) => {
	let timeout: number | undefined

	return (...args: Parameters<T>) => {
		const later = () => {
			timeout = undefined
			if (!immediate) func(...args)
		}

		const callNow = immediate && !timeout
		clearTimeout(timeout)
		timeout = window.setTimeout(later, wait)

		if (callNow) func(...args)
	}
}

// Throttle utility for performance optimization
export const throttle = <T extends (...args: any[]) => void>(
	func: T,
	limit: number
): ((...args: Parameters<T>) => void) => {
	let inThrottle: boolean

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args)
			inThrottle = true
			setTimeout(() => (inThrottle = false), limit)
		}
	}
}