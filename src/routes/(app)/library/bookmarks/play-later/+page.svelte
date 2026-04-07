<script lang="ts">
	import Header from '$lib/components/Header.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'

	const player = usePlayer()
</script>

<div class="mx-auto flex w-full max-w-(--app-max-content-width) grow flex-col">
	<Header title="Play later" mode="fixed" />

	<div class="flex grow px-4 pb-4">
		{#if player.isQueueEmpty}
			<div class="m-auto text-center text-onSurfaceVariant">Nothing saved for play later.</div>
		{:else}
			<TracksListContainer
				items={player.itemsIds}
				predefinedMenuItems={{
					addToQueue: false,
				}}
				onItemClick={({ index }) => {
					player.playTrack(index)
				}}
			/>
		{/if}
	</div>
</div>
