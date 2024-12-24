<script lang="ts">
	// Spinner from https://codepen.io/mrrocks/pen/EiplA

	interface Props {
		class?: string
	}

	const { class: className }: Props = $props()
</script>

<svg class={['spinner', className]} fill="transparent" width="40" height="40" viewBox="0 0 66 66">
	<circle class="path" cx="33" cy="33" r="30" />
</svg>

<style>
	.spinner {
		--spinner-duration: 1.4s;
		--spinner-offset: 187;
		animation: rotate var(--spinner-duration) linear infinite;
		color: currentcolor;
	}

	.path {
		stroke: currentcolor;
		stroke-width: 6;
		stroke-linecap: round;
		stroke-dasharray: var(--spinner-offset);
		stroke-dashoffset: 0;
		transform-origin: center;
		animation: dash var(--spinner-duration) ease-in-out infinite;
	}

	@keyframes rotate {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(270deg);
		}
	}

	@keyframes dash {
		0% {
			stroke-dashoffset: var(--spinner-offset);
		}
		50% {
			stroke-dashoffset: 46.75;
			transform: rotate(135deg);
		}
		100% {
			stroke-dashoffset: var(--spinner-offset);
			transform: rotate(450deg);
		}
	}
</style>
