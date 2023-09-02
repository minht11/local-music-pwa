<script lang="ts">
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
</script>

<div
	class="overlay fixed flex items-center left-0 right-0 bottom-8 mx-auto h-96 w-full max-w-[1000px] rounded-24 bg-secondaryContainer text-onSecondaryContainer"
>
	<Button as="a" href="/player" class="w-max">Open player</Button>

	<div class="flex gap-8">
		<IconButton icon="play" />

		<IconButton icon="musicNote" />
	</div>
</div>

<style>
	.overlay {
		view-transition-name: player-overlay;
	}
</style>
