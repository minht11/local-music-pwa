<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import IconButton from './IconButton.svelte'

	const {
		children,
		class: className,
		style,
		ariaLabel,
		ariaRowIndex,
		tabindex = 0,
		onclick,
	} = $props<{
		style?: string
		class?: string
		ariaLabel?: string
		ariaRowIndex?: number
		tabindex?: number
		children: Snippet
		onclick?: () => void
	}>()

	const menu = useMenu()

	const clickHandler = () => onclick?.()
</script>

<div
	use:ripple
	{style}
	{tabindex}
	class={clx(
		className,
		'cursor-pointer hover:bg-onSurface/10 rounded-8px overflow-hidden pl-16px pr-8px flex items-center',
	)}
	role="row"
	aria-label={ariaLabel}
	aria-rowindex={ariaRowIndex}
	onclick={clickHandler}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			clickHandler()
		}
	}}
>
	{@render children()}

	<IconButton
		tabindex={-1}
		icon="moreVertical"
		onclick={(e) => {
			e.stopPropagation()

			menu.show([], e.target as HTMLElement, {
				anchor: true,
				preferredAlignment: {
					horizontal: 'right',
					vertical: 'top',
				}
			})
		}}
	/>
</div>
