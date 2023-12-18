<script lang="ts">
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
	import Icon from './icon/Icon.svelte'
	import Artwork from './player/Artwork.svelte'
	import MainControls from './player/MainControls.svelte'
	import Timeline from './player/Timeline.svelte'
</script>

<div
	class="overlay px-16px pt-8px gap-8px fixed flex flex-col items-center left-0 right-0 bottom-8px mx-auto h-96px w-full max-w-1000px rounded-24px bg-secondaryContainer text-onSecondaryContainer"
>
	<Timeline />
	<div class="grid items-center w-full controls">
		<Button
			as="a"
			href="/player"
			kind="blank"
			class="flex gap-16px items-center rounded-8px pr-8px max-w-180px"
		>
			<Artwork class="h-44px w-44px view-transition-artwork" />

			<div>
				<div class="truncate text-body-md">Song Title</div>
				<div class="truncate text-body-sm">Artist Name</div>
			</div>

			<Icon type="chevronUp" class="bg-tertiary text-onTertiary rounded-full" />
		</Button>

		<MainControls />

		<div class="ml-auto">
			<IconButton icon="moreVertical" />
		</div>
	</div>
</div>

<style>
	.overlay {
		view-transition-name: player-overlay;
	}

	.controls {
		grid-template-columns: 1fr max-content 1fr;
	}
</style>
