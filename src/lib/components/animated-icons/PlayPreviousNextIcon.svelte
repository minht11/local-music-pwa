<script lang="ts">
	import { wait } from '$lib/helpers/utils'

	interface Props {
		type: 'next' | 'previous'
	}

	const { type }: Props = $props()

	const flipIcon = $derived(type === 'previous')

	let isAnimating = $state(false)
	const onclick = async () => {
		isAnimating = true

		wait(200).then(() => {
			isAnimating = false
		})
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class={clx(flipIcon && 'flip-x')}
	data-icon-animating={isAnimating ? '' : undefined}
	on:keydown={onclick}
	{onclick}
>
	<svg class="icon-clip fill-current w-24px h-24px" viewBox="0 0 24 24">
		<path class="skip-top" d="M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14" />
		<path class="skip-bottom invisible" d="M 6,18 14.5,12 6,6 M 8,9.86 11.03,12 8,14.14" />
		<path d="M16,6L16,18L18,18L18,6L16,6Z" />
	</svg>
</div>

<style>
	.icon-clip {
		clip-path: inset(0 6px 0 0);
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
			transform: translate(10px, 0px);
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
