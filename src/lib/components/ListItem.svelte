<script lang="ts" module>
	import { ripple } from '$lib/attachments/ripple.ts'
</script>

<script lang="ts">
	interface Props {
		style?: string
		class?: ClassValue
		ariaLabel: string
		ariaRowIndex: number
		tabindex: number
		children: Snippet
		onclick?: (e: KeyboardEvent | MouseEvent) => void
		onpointerenter?: (e: PointerEvent) => void
		oncontextmenu?: (e: MouseEvent) => void
	}

	const {
		children,
		class: className,
		style,
		ariaLabel,
		ariaRowIndex,
		tabindex = 0,
		onclick,
		oncontextmenu,
		onpointerenter,
	}: Props = $props()

	const clickHandler = (e: KeyboardEvent | MouseEvent) => onclick?.(e)
</script>

<div
	{@attach ripple()}
	{style}
	{tabindex}
	class={[
		className,
		'flex cursor-pointer items-center overflow-hidden rounded-lg pr-2 pl-4 -outline-offset-2 contain-content hover:bg-onSurface/10',
	]}
	role="row"
	aria-label={ariaLabel}
	aria-rowindex={ariaRowIndex}
	onclick={clickHandler}
	{onpointerenter}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			clickHandler(e)
		}
	}}
	{oncontextmenu}
>
	{@render children()}
</div>
