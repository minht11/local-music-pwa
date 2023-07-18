import { readable } from 'svelte/store'

export const time = readable(new Date(), (set) => {
	set(new Date())

	const interval = setInterval(() => {
		set(new Date())
	}, 1000)

	return () => clearInterval(interval)
})

export {}
