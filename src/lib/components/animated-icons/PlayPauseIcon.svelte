<script lang="ts">
	interface Props {
		playing?: boolean
	}

	const { playing = false }: Props = $props()
</script>

<div class={clx('w-24px h-24px relative z-1 play-icon', playing && 'rotate-90 playing')}>
	<div class="play-bar"></div>
	<div class="play-bar flip-y"></div>
</div>

<style>
	.play-icon {
		transition: transform 0.2s ease-out;
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
