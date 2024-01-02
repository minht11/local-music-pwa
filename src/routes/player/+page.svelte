<script>
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { usePlayer } from '$lib/stores/player/store'
	import MainControls from '$lib/components/player/MainControls.svelte'

	const player = usePlayer()
	const track = $derived(player.activeTrack.value)
</script>

<section
	class="view-transition-player-overlay mx-auto overflow-hidden max-h-[140px] w-full grow grid grid-cols-[400px_1fr] bg-red rounded-24px tonal-elevation-2"
>
	<div class="bg-secondaryContainer flex flex-col rounded-t-24px overflow-hidden">
		<div class="p-40px relative h-full">
			<PlayerArtwork class="rounded-16px view-transition-artwork" />

			<div class="min-w-0 flex flex-col justify-center h-72px">
				{#if track}
					<div class="truncate text-title-lg">{track.name}</div>
					<div class="truncate text-body-md">{track.artists}</div>
				{/if}
			</div>

			<div class="flex items-center justify-center gap-24px">
				<IconButton icon="musicNote" />

				<MainControls />

				<IconButton icon="musicNote" />
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
</style>
