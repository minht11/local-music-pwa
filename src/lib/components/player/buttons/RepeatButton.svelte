<script lang="ts">
	import type { PlayerRepeat } from '$lib/stores/player/player.svelte'
	import { on } from 'svelte/events'
	import invariant from 'tiny-invariant'
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: string } = $props()

	const player = usePlayer()

	const action = (target: SVGSVGElement) => {
		let button = target.parentElement

		while (button) {
			if (button.tagName === 'BUTTON') {
				break
			}

			button = button.parentElement
		}

		invariant(button, 'No button found')

		let animation: Animation | null = null
		const cleanup = on(button, 'click', () => {
			if ((button as HTMLButtonElement).disabled) {
				return
			}

			const arrows = target.querySelector('[data-arrows]')
			if (!arrows || animation) {
				return
			}

			animation = arrows.animate(
				{
					transform: ['rotate(0deg)', 'rotate(180deg)'],
				},
				{
					duration: 300,
					easing: 'ease-out',
					fill: 'none',
				},
			)

			animation.onfinish = () => {
				animation = null
			}
		})

		return {
			destroy: cleanup,
		}
	}

	const tooltipMap: Record<PlayerRepeat, string> = {
		none: m.playerEnableRepeat(),
		all: m.playerEnableRepeatOne(),
		one: m.playerDisableRepeat(),
	}
</script>

<IconButton tooltip={tooltipMap[player.repeat]} class={className} onclick={player.toggleRepeat}>
	<svg
		use:action
		class={clx('size-24px fill-current', player.repeat !== 'none' && '')}
		viewBox="0 0 24 24"
	>
		<path
			data-arrows
			class="transform-origin-center"
			d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
		/>
		<path
			class={clx(
				'transition-transform transform-origin-center',
				player.repeat === 'one' ? 'scale-100' : 'scale-0',
			)}
			d="M 13,15 V 9.0000002 H 12 L 10,10 v 1 h 1.5 v 4 z"
		/>
	</svg>
	<div
		class={clx(
			'size-4px rounded-full bg-primary absolute bottom-4px transition-1000 transition-transform transform-origin-center',
			player.repeat === 'none' ? 'scale-0' : 'scale-100',
		)}
	></div>
</IconButton>
