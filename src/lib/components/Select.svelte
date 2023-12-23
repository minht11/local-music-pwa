<script lang="ts" generics="T">
	import { computePosition, autoUpdate, size, shift, flip } from '@floating-ui/dom'

	const { options, value } = $props<{
		options: T[]
		value: T
	}>()

	let target = $state<HTMLButtonElement>()!
	let popover = $state<HTMLDivElement>()!

	const buttonEnter = (node: HTMLButtonElement) => {
		node.popoverTargetElement = popover
	}

	$effect(() => {
		console.log('effect', target, popover)
		const cleanup = autoUpdate(target, popover, () => {
			computePosition(target, popover, {
				strategy: 'fixed',
				middleware: [size(), shift(), flip()],
			}).then((rect) => {
				const { x, y } = rect
				popover.style.left = `${x}px`
				popover.style.top = `${y}px`
				console.log(x, y)
			})
		})

		return cleanup
	})
</script>

<button bind:this={target} use:buttonEnter class={clx('border px-16px border-outline rounded-8px')}>
	Click me!
</button>

<div
	bind:this={popover}
	popover
	class="m-0 h-400px rounded-4px overscroll-contain shadow-md tonal-elevation-2"
>
	Greetings, one and all!
</div>
