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
}
