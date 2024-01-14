<script lang="ts">
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'

	const { data } = $props()

	const album = data.albumQuery()
	const tracks = data.tracksQuery()

	const [artwork] = createManagedArtwork(() => album.value?.image)
</script>

<section class="h-192px p-16px flex">
	<Artwork src={artwork()} class="rounded-8px" />

	<div class="pl-16px flex flex-col">
		<h1 class="text-headline-md">{album.value?.name}</h1>
		<h2 class="text-body-lg">{album.value?.artists.join(', ')}</h2>
		<div>
			{album.value?.year} • {tracks.value?.length} tracks
		</div>

		<div class="flex gap-8px mt-auto">
			<Button kind="toned">
				Shuffle
				<Icon type="shuffle" />
			</Button>

			<Button kind="outlined">
				<Icon type="delete" />
				Remove
			</Button>
		</div>
	</div>
</section>

<TracksListContainer
	items={tracks.value ?? []}
	onItemClick={({ items, index }) => {
		// player.playTrack(index, items)
	}}
/>
