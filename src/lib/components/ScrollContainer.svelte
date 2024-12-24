<script lang="ts" module>
	import { getContext, setContext } from 'svelte'

	type ScrollTargetElement = Element | Window | null

	const contextKey = Symbol('scroll-target')

	export const useScrollTarget = () => {
		const nodeGetter = getContext<() => ScrollTargetElement>(contextKey)

		return {
			get scrollTarget() {
				const node = nodeGetter?.()

				return node ?? window
			},
		}
	}
</script>

<script lang="ts">
	interface Props {
		class?: ClassNameValue
		children: Snippet
	}

	const { class: className, children }: Props = $props()

	let scrollTarget = $state<ScrollTargetElement>(null)

	setContext(contextKey, () => scrollTarget)
</script>

<div bind:this={scrollTarget} class={className}>
	{@render children()}
</div>
