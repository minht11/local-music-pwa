declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			noPlayerOverlay?: boolean
			isHandHeldDevice: boolean
		}
		// interface Platform {}
	}
}

interface Navigator {
	// Optional because Safari and Firefox don't support it
	userAgentData?: {
		mobile: boolean
		brands: {
			brand: string
			version: string
		}[]
	}
}

interface PromiseConstructor {
	withResolvers<T>(): {
		resolve: (value?: T) => void
		reject: (reason?: unknown) => void
		promise: Promise<T>
	}
}
