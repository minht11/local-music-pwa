<script>
	import Artwork from '$lib/components/player/Artwork.svelte'
	import PlayPauseIcon from '$lib/components/animated-icons/PlayPauseIcon.svelte'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import PlayPreviousNextIcon from '$lib/components/animated-icons/PlayPreviousNextIcon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { usePlayer } from '$lib/stores/player/store'

	const player = usePlayer()
</script>

<section
	class="overlay mx-auto grid flex-grow grid-cols-[400px_1fr] h-full bg-surface rounded-t-24px tonal-elevation-2"
>
	<div class="bg-secondaryContainer wh-full flex flex-col rounded-t-24px overflow-hidden">
		<div class="p-40px relative h-full">
			<Artwork class="view-transition-artwork rounded-16px" />

			<div class="flex items-center justify-center gap-24px">
				<IconButton icon="musicNote" class="bg-tertiary text-onTertiary" />

				<Button
					kind="blank"
					class="flex rounded-20px items-center justify-center bg-primary text-onPrimary h-72px w-120px"
				>
					<PlayPauseIcon />
				</Button>

				<Button>
					<PlayPreviousNextIcon type="previous" />
				</Button>

				<IconButton icon="musicNote" class="bg-tertiary text-onTertiary" />
			</div>
		</div>
	</div>
	<div class="w-full p-16px flex flex-col">
		<div class="flex items-center h-48px">
			<div class="text-title-md mr-auto ml-16px">Queue list</div>

			<Button kind="flat">Clear</Button>
		</div>

		{#if player.itemsIds.length === 0}
			<div class="m-auto text-center flex flex-col items-center gap-8px">
				<div>Your queue is empty</div>
				<Button kind="outlined" as="a" href="/">Play something here</Button>
			</div>
		{:else}
			<TracksListContainer
				items={player.itemsIds}
				onItemClick={({ index }) => {
					player.playTrack(index)
				}}
			/>
		{/if}
	</div>
</section>

<style>
	/* :root::view-transition-old(root),
	:root::view-transition-new(root) {
		animation-duration: 500ms;
	} */

	.overlay {
		view-transition-name: player-overlay;
	}
</style>
