<script lang="ts" context="module">
	import { getContext, setContext } from 'svelte'
	import invariant from 'tiny-invariant'

	type ScrollTargetElement = Element | Window | null

	const contextKey = Symbol('scroll-target')

	export const useScrollTarget = () => {
		const nodeGetter = getContext<() => ScrollTargetElement>(contextKey)

		if (nodeGetter) {
			return {
				get scrollTarget() {
					const node = nodeGetter()

					invariant(node, 'Scroll target is not defined')

					return node
				},
			}
		}

		return {
			scrollTarget: window,
		}
	}
</script>

<script>
	interface Props {
		class?: string
		children: Snippet
	}

	const { class: className, children }: Props = $props()

	let scrollTarget = $state<ScrollTargetElement>(null)

	setContext(contextKey, () => scrollTarget)
</script>

<div bind:this={scrollTarget} class={className}>
	{@render children()}
</div>
