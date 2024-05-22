declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			noPlayerOverlay?: boolean
			noHeader?: boolean
			hideBackButton?: boolean
			pageTitle?: string
			title: string
			isHandHeldDevice: boolean
			disableContentPadding?: boolean
		}
		// interface Platform {}
	}
}

interface Navigator {
	userAgentData: {
		mobile: boolean
	}
}

interface PromiseConstructor {
	withResolvers<T>(): {
		resolve: (value?: T) => void
		reject: (reason?: unknown) => void
		promise: Promise<T>
	}
}
