import type { HTMLAttributes } from 'svelte/elements'

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

	export type ClassNameValue = HTMLAttributes<HTMLElement>['class']

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
}
