<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import IconButton from './IconButton.svelte'

	const {
		children,
		class: className,
		style,
	} = $props<{
		style?: string
		class?: string
		children: Snippet
		onclick?: (e: Event) => void
	}>()

	const menu = useMenu()
</script>

<li
	use:ripple
	{style}
	class={clx(
		className,
		'cursor-pointer hover:bg-onSurface/10 rounded-8px overflow-hidden pl-16px pr-8px flex items-center',
	)}
	role="presentation"
>
	{@render children()}

	<IconButton
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
</li>
