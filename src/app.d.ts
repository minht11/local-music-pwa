declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			hidePlayerOverlay?: boolean
			hideBackButton?: boolean
			pageTitle?: string
			title: string
		}
		// interface Platform {}
	}
}

interface PromiseConstructor {
	withResolvers<T>(): {
		resolve: (value?: T) => void
		reject: (reason?: unknown) => void
		promise: Promise<T>
	}
}
