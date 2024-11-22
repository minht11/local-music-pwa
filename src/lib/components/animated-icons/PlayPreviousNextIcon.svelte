<script lang="ts">
	import { wait } from '$lib/helpers/utils/wait.ts'
	import { on } from 'svelte/events'
	import invariant from 'tiny-invariant'

	interface Props {
		type: 'next' | 'previous'
	}

	const { type }: Props = $props()

	const flipIcon = $derived(type === 'previous')

	let isAnimating = $state(false)
	const animate = async () => {
		isAnimating = true

		wait(200).then(() => {
			isAnimating = false
		})
	}

	const action = (target: HTMLDivElement) => {
		let button = target.parentElement

		while (button) {
			if (button.tagName === 'BUTTON') {
				break
			}

			button = button.parentElement
		}

		invariant(button, 'No button found')

		const cleanup = on(button, 'click', () => {
			if ((button as HTMLButtonElement).disabled) {
				return
			}

			animate()
		})

		return {
			destroy: cleanup,
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={clx(flipIcon && 'flip-x', 'grid')}
	data-icon-animating={isAnimating ? '' : undefined}
	use:action
>
	<!-- Cannot add clip on svg itself because of Safari bug  -->
	<div class="icon-clip [grid-area:1/1]">
		<svg class="size-6 fill-current" viewBox="0 0 24 24">
			<path class="skip-top" d="M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14" />
			<path class="skip-bottom invisible" d="M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14" />
		</svg>
	</div>
	<svg class="size-6 fill-current [grid-area:1/1]" viewBox="0 0 24 24">
		<path d="M16,6L16,18L18,18L18,6L16,6Z" />
	</svg>
</div>

<style>
	.icon-clip {
		clip-path: inset(0 8px 0 6px);
	}

	@keyframes skipTopAni {
		from {
			transform: translate(0px, 0px);
		}
		to {
			transform: translate(10px, 0px);
		}
	}

	[data-icon-animating] .skip-top {
		animation: skipTopAni 0.2s ease-out;
	}

	@keyframes skipBottomAni {
		from {
			transform: translate(-10px, 0px);
		}
		to {
			transform: translate(0px, 0px);
		}
	}

	[data-icon-animating] .skip-bottom {
		animation: skipBottomAni 0.2s ease-out;
		visibility: visible;
		transform-origin: left center;
	}
</style>
