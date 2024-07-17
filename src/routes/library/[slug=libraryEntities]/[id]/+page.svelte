<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueries } from '$lib/db/db-fast.svelte.js'
	import type { Playlist } from '$lib/db/entities.js'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import { useMainStore } from '$lib/stores/main-store.svelte.ts'

	const { data } = $props()
	const main = useMainStore()

	initPageQueries(data)

	const { itemQuery, tracksQuery, store } = data

	const item = $derived(itemQuery.value)
	const tracks = $derived(tracksQuery.value)

	const [artwork] = createManagedArtwork(() => item.image)

	const player = usePlayer()
	const menu = useMenu()

	const isWideLayout = useMediaQuery('(min-width: 1154px)')

	const getMenuItems = () => {
		if (data.slug === 'playlists') {
			// TODO. Make item type inferable from data.slug
			return getPlaylistMenuItems(main, item as Playlist)
		}

		return []
	}
</script>

{#if !isWideLayout.value}
	<Header title={store.singularTitle} mode="fixed" />
{/if}

<div class="@container grow flex flex-col px-16px">
	<section
		class="@2xl:h-224px gap-24px flex flex-col @2xl:flex-row items-center justify-center w-full py-16px"
	>
		{#if data.slug !== 'playlists'}
			<Artwork src={artwork()} class="rounded-16px shrink-0 h-196px @2xl:h-full" />
		{/if}

		<div class="flex flex-col bg-surfaceContainerHigh rounded-16px h-full w-full">
			<div class="flex flex-col p-16px grow">
				<div class="flex items-center gap-8px">
					<Icon type="playlist" class="text-onSurface/54 size-40px" />

					<h1 class="text-headline-md">{item.name}</h1>
				</div>
				<!-- <h2 class="text-body-lg">{album.artists.join(', ')}</h2>
				<div>
					{album.year} • {tracks.length} tracks
				</div> -->
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

						menu.showFromEvent(e, getMenuItems(), {
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

	<TracksListContainer items={tracks} />
</div>
