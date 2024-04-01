<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueries } from '$lib/db/db-fast.svelte.js'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'

	const { data } = $props()

	initPageQueries(data)

	const album = $derived(data.albumQuery.value)
	const tracks = $derived(data.tracksQuery.value)

	const [artwork] = createManagedArtwork(() => album?.image)
</script>

<section class="h-256px px-16px pb-40px mb-24px flex items-center border-b border-outlineVariant">
	<Artwork src={artwork()} class="rounded-8px h-full" />

	<div class="pl-24px flex flex-col">
		<h1 class="text-headline-md">{album.name}</h1>
		<h2 class="text-body-lg">{album.artists.join(', ')}</h2>
		<div>
			{album.year} • {tracks.length} tracks
		</div>

		<div class="flex gap-8px mt-16px">
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

<TracksListContainer items={tracks} />
