// Needed for SSR to work
const getWindow = () => {
	if (typeof window !== 'undefined') {
		return window
	}

	return null
}

class WindowStore {
	windowWidth: number = $state(getWindow()?.innerWidth ?? 0)
	windowHeight: number = $state(getWindow()?.innerHeight ?? 0)

	constructor() {
		if (!import.meta.env.SSR) {
			window.addEventListener('resize', () => {
				this.windowWidth = window.innerWidth
				this.windowHeight = window.innerHeight
			})
		}
	}
}

export const windowStore = new WindowStore()
