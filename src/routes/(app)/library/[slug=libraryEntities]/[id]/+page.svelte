<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import type { Album, Playlist } from '$lib/db/database-types.ts'
	import type { TrackData } from '$lib/db/entity.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { removeTrackFromPlaylistInDatabase } from '$lib/library/playlists.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import { MediaQuery } from 'svelte/reactivity'

	const { data } = $props()
	const main = useMainStore()

	initPageQueries(data)

	const { itemQuery, tracksQuery } = data

	const item = $derived(itemQuery.value)
	const tracks = $derived(tracksQuery.value)

	const artworkSrc = createManagedArtwork(() => {
		if (data.slug !== 'playlists') {
			return (item as Album).image
		}

		return null
	})

	const player = usePlayer()
	const menu = useMenu()

	const isWideLayout = new MediaQuery('(min-width: 1154px)')

	const getMenuItems = () => {
		if (data.slug === 'playlists') {
			return getPlaylistMenuItems(main, item as Playlist)
		}

		return []
	}

	const trackMenuItems = (track: TrackData) => [
		{
			label: 'Remove from playlist',
			action: () => {
				// TODO. Error handling
				removeTrackFromPlaylistInDatabase(item.id, track.id)
			},
		},
	]
</script>

{#if !isWideLayout.current}
	<Header title={data.singularTitle()} mode="fixed" />
{/if}

<div class="@container flex grow flex-col px-4 pb-4">
	<section
		class="relative flex w-full flex-col items-center justify-center gap-6 overflow-clip py-4 @2xl:h-56 @2xl:flex-row"
	>
		{#if data.slug !== 'playlists'}
			<Artwork src={artworkSrc()} class="h-49 shrink-0 rounded-2xl @2xl:h-full" />
		{/if}

		<div
			class="relative z-0 flex h-full w-full flex-col overflow-clip rounded-2xl bg-surfaceContainerHigh"
		>
			<div class="flex grow flex-col p-4">
				<div class="flex items-center gap-2">
					<Icon type="playlist" class="size-10 text-onSurface/54" />

					<h1 class="text-headline-md">{item.name}</h1>
				</div>
				<!-- <h2 class="text-body-lg">{album.artists.join(', ')}</h2>
				<div>
					{album.year} • {tracks.length} tracks
				</div> -->
			</div>

			<div class="mt-auto flex items-center gap-2 py-4 pr-2 pl-4">
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
					tooltip="More"
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

	<TracksListContainer
		items={tracks}
		menuItems={data.slug === 'playlists' ? trackMenuItems : undefined}
	/>
</div>
