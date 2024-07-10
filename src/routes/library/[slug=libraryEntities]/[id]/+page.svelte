<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueries } from '$lib/db/db-fast.svelte.js'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte.ts'

	const { data } = $props()

	initPageQueries(data)

	const { albumQuery, tracksQuery, store } = data

	const album = $derived(albumQuery.value)
	const tracks = $derived(tracksQuery.value)

	const [artwork] = createManagedArtwork(() => album.image)

	const player = usePlayer()
	const menu = useMenu()

	const isWideLayout = useMediaQuery('(min-width: 1154px)')
</script>

{#if !isWideLayout.value}
	<Header title={store.singularTitle} mode="fixed" />
{/if}

<div class="@container">
	<section
		class="@2xl:h-224px gap-24px flex flex-col @2xl:flex-row items-center justify-center w-full p-16px"
	>
		<Artwork src={artwork()} class="rounded-16px shrink-0 h-196px @2xl:h-full" />

		<div class="flex flex-col bg-surfaceContainerHigh rounded-16px h-full w-full">
			<div class="flex flex-col p-16px grow">
				<h1 class="text-headline-md">{album.name}</h1>
				<h2 class="text-body-lg">{album.artists.join(', ')}</h2>
				<div>
					{album.year} • {tracks.length} tracks
				</div>
			</div>

			<div class="flex gap-8px mt-auto py-16px pl-16px pr-8px items-center">
				<Button
					kind="toned"
					class="mr-auto"
					onclick={() => {
						player.playTrack(0, tracks, {
							shuffle: true,
						})
					}}
				>
					Shuffle
					<Icon type="shuffle" />
				</Button>

				<IconButton
					icon="moreVertical"
					onclick={(e) => {
						e.stopPropagation()

						menu.showFromEvent(e, [], {
							anchor: true,
							preferredAlignment: {
								horizontal: 'right',
								vertical: 'top',
							},
						})
					}}
				/>
			</div>
		</div>
	</section>

	<div class="px-16px">
		<TracksListContainer items={tracks} />
	</div>
</div>
