<script lang="ts">
	import { Debounced } from '$lib/helpers/debounced.svelte'
	import Spinner from '../Spinner.svelte'

	interface Props {
		playing?: boolean
		loading?: boolean
	}

	const { playing = false, loading = false }: Props = $props()

	// Debounce short amount so state doesn't flicker
	const isLoadingAndPlaying = new Debounced(() => loading && playing, 200)
</script>

{#if isLoadingAndPlaying.current}
	<Spinner class="absolute size-8 text-current" />
{/if}

<div class={['play-icon relative z-1 size-6', playing && 'playing rotate-90']}>
	<div class="play-bar"></div>
	<div class="play-bar flip-y"></div>
</div>

<style>
	.play-icon {
		transition: rotate 0.2s ease-out;
	}

	.play-bar {
		background: currentcolor;
		height: 50%;
		clip-path: polygon(32% 40%, 82% 102%, 82% 102%, 32% 102%);
		transition: clip-path 0.2s ease-out;
		.playing & {
			clip-path: polygon(22% 50%, 80% 50%, 80% 84%, 22% 84%);
		}
	}
</style>
