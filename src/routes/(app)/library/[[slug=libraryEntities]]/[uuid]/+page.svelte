<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity'
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import type { AlbumData, TrackData } from '$lib/library/get/value.ts'
	import { FAVORITE_PLAYLIST_ID, removeTrackFromPlaylist } from '$lib/library/playlists-actions.ts'
	import { removeAlbum, removeArtist } from '$lib/library/remove.js'
	import type { Album, Playlist } from '$lib/library/types.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'

	const { data } = $props()
	const main = useMainStore()

	initPageQueries(data)

	const { itemQuery, tracksQuery } = data

	const item = $derived(itemQuery.value)
	const tracks = $derived(tracksQuery.value)
	const slug = $derived(data.slug)

	const getFallbackArtwork = () => {
		if (slug === 'playlists') {
			return 'playlist'
		}

		if (slug === 'albums') {
			return 'album'
		}

		return 'person'
	}

	const artworkSrc = createManagedArtwork(() => {
		if (slug !== 'playlists') {
			return (item as Album).image
		}

		return null
	})

	const player = usePlayer()
	const menu = useMenu()

	const isWideLayout = new MediaQuery('(min-width: 1154px)')

	const playlistTrackMenuItems = (_: TrackData, index: number) => {
		return [
			{
				label: m.libraryTrackRemoveFromPlaylist(),
				action: () => {
					const entryId = tracks.playlistIdMap?.[index]
					if (!entryId) {
						throw new Error('Playlist entry id not found')
					}

					void removeTrackFromPlaylist(entryId)
				},
			},
		]
	}

	const menuItems = $derived.by(() => {
		if (slug === 'playlists') {
			if (item.id === FAVORITE_PLAYLIST_ID) {
				return null
			}

			return getPlaylistMenuItems(main, item as Playlist)
		}

		return [
			{
				label: m.libraryAddToPlaylist(),
				action: () => {
					main.addTrackToPlaylistDialogOpen = tracks.tracksIds
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					if (slug === 'albums') {
						void removeAlbum(item.id)
					}

					if (slug === 'artists') {
						void removeArtist(item.id)
					}
				},
			},
		]
	})
</script>

{#if !isWideLayout.current}
	<Header title={data.singularTitle()} mode="fixed" />
{/if}

<div class="@container flex grow flex-col px-4 pb-4">
	<section
		class="relative flex w-full flex-col items-center justify-center gap-6 overflow-clip py-4 @2xl:h-56 @2xl:flex-row"
	>
		{#if slug !== 'playlists'}
			<Artwork
				src={artworkSrc()}
				fallbackIcon={getFallbackArtwork()}
				class="h-49 shrink-0 rounded-2xl @2xl:h-full"
			/>
		{/if}

		<div
			class="relative z-0 flex h-full w-full flex-col overflow-clip rounded-2xl bg-surfaceContainerHigh"
		>
			<div class="flex grow flex-col p-4">
				<div class="flex items-center gap-2">
					<Icon type="playlist" class="size-10 text-onSurface/54" />

					<h1 class="text-headline-md">{item.name}</h1>
				</div>

				{#if slug === 'albums'}
					<div class="text-body-lg">{(item as AlbumData).artists.join(', ')}</div>
				{/if}

				<div>
					{#if slug === 'albums' && (item as AlbumData).year}
						{(item as AlbumData).year} •
					{/if}

					{m.libraryTracksCount({ count: tracks.tracksIds.length })}
				</div>
			</div>

			<div class="mt-auto flex items-center gap-2 py-4 pr-2 pl-4">
				<Button
					kind="toned"
					class="my-1 mr-auto"
					disabled={tracks.tracksIds.length === 0}
					onclick={() => {
						player.playTrack(0, tracks.tracksIds, {
							shuffle: true,
						})
					}}
				>
					{m.shuffle()}
					<Icon type="shuffle" />
				</Button>

				{#if menuItems}
					<IconButton
						icon="moreVertical"
						tooltip={m.more()}
						onclick={(e) => {
							menu.showFromEvent(e, menuItems, {
								anchor: true,
								preferredAlignment: {
									horizontal: 'right',
									vertical: 'top',
								},
							})
						}}
					/>
				{/if}
			</div>
		</div>
	</section>

	<TracksListContainer
		items={tracks.tracksIds}
		predefinedMenuItems={{
			viewAlbum: slug !== 'albums',
			viewArtist: slug !== 'artists',
		}}
		menuItems={slug === 'playlists' ? playlistTrackMenuItems : undefined}
	/>
</div>
