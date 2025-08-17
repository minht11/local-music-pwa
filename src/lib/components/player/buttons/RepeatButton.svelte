<script lang="ts">
	import { on } from 'svelte/events'
	import type { PlayerRepeat } from '$lib/stores/player/player.svelte'
	import IconButton from '../../IconButton.svelte'
	import ActiveIndicator from './ActiveIndicator.svelte'

	const { class: className }: { class?: ClassValue } = $props()

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

		return cleanup
	}

	const tooltipMap: Record<PlayerRepeat, string> = {
		none: m.playerEnableRepeat(),
		all: m.playerEnableRepeatOne(),
		one: m.playerDisableRepeat(),
	}
</script>

<IconButton tooltip={tooltipMap[player.repeat]} class={className} onclick={player.toggleRepeat}>
	<svg {@attach action} class="size-6 fill-current" viewBox="0 0 24 24">
		<path
			data-arrows
			class="origin-center"
			d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
		/>
		<path
			class={[
				'origin-center transition-transform',
				player.repeat === 'one' ? 'scale-100' : 'scale-0',
			]}
			d="M 13,15 V 9.0000002 H 12 L 10,10 v 1 h 1.5 v 4 z"
		/>
	</svg>

	<ActiveIndicator active={player.repeat !== 'none'} />
</IconButton>
