import type { Snippet as SnippetInternal } from 'svelte'
import type { ClassValue as ClassValueInternal, HTMLAttributes } from 'svelte/elements'

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			noPlayerOverlay?: boolean
		}
		// interface Platform {}
	}

	// Not using unplugin auto import because because when used getting error:
	// Exported variable 'Foo' has or is using private name 'ParentChild'
	type ClassValue = ClassValueInternal
	type Snippet<Parameters extends unknown[] = []> = SnippetInternal<Parameters>

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

	/**
	 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt handler
	 * before a user is prompted to "install" a web site to a home screen on mobile.
	 */
	interface BeforeInstallPromptEvent extends Event {
		/**
		 * Returns an array of DOMString items containing the platforms on which the event was dispatched.
		 * This is provided for user agents that want to present a choice of versions to the user such as,
		 * for example, "web" or "play" which would allow the user to chose between a web version or
		 * an Android version.
		 */
		readonly platforms: string[]

		/**
		 * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
		 */
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed'
			platform: string
		}>

		/**
		 * Allows a developer to show the install prompt at a time of their own choosing.
		 * This method returns a Promise.
		 */
		prompt(): Promise<void>
	}

	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent
	}

	interface GoatCounter {
		count: (data: {
			path: string
			title?: string
			event: boolean
		}) => void
	}

	interface Window {
		/** Analytics. If ad blocker blocks it this will be undefined */
		goatcounter?: GoatCounter
	}
}
