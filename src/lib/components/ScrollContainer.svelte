<script lang="ts" module>
	import { getContext, setContext } from 'svelte'

	type ScrollTargetElement = Element | Window | null

	const contextKey = Symbol('scroll-target')

	export const useScrollTarget = () => {
		const nodeGetter = getContext<() => ScrollTargetElement>(contextKey)

		return {
			get scrollTarget(): Element | Window {
				const node = nodeGetter?.()

				return node ?? window
			},
		}
	}
</script>

<script lang="ts">
	interface Props {
		class?: ClassValue
		offsetWidth?: number
		children: Snippet
	}

	let { class: className, offsetWidth = $bindable(), children }: Props = $props()

	let scrollTarget = $state<ScrollTargetElement>(null)

	setContext(contextKey, () => scrollTarget)
</script>

<div bind:this={scrollTarget} bind:offsetWidth class={['overscroll-contain', className]}>
	{@render children()}
</div>
