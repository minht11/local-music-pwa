<script lang="ts" module>
	import { createContext } from 'svelte'

	type ScrollTargetElement = Element | Window | null

	const [getScrollTarget, setScrollTarget, hasScrollTarget] =
		createContext<() => ScrollTargetElement>()

	export const useScrollTarget = () => {
		// A scoped target remains null until its element mounts. Falling back to
		// window here would seed descendants with the previous page's scroll offset.
		const nodeGetter = hasScrollTarget() ? getScrollTarget() : () => window

		return {
			get current(): Element | Window | null {
				return nodeGetter()
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

	setScrollTarget(() => scrollTarget)
</script>

<div bind:this={scrollTarget} bind:offsetWidth class={['overscroll-contain', className]}>
	{@render children()}
</div>
