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
	import { formatArtists, formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import type { AlbumData, TrackData } from '$lib/library/get/value.ts'
	import {
		FAVORITE_PLAYLIST_ID,
		removeTrackEntryFromPlaylist,
	} from '$lib/library/playlists-actions.ts'
	import { type Album, type Playlist, UNKNOWN_ITEM } from '$lib/library/types.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'

	const { data } = $props()

	const menu = useMenu()
	const main = useMainStore()
	const player = usePlayer()

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

	const isWideLayout = new MediaQuery('(min-width: 1154px)')

	const playlistTrackMenuItems = (track: TrackData) => {
		if (item.id === FAVORITE_PLAYLIST_ID) {
			return []
		}

		return [
			{
				label: m.libraryTrackRemoveFromPlaylist(),
				action: () => {
					const entryId = tracks.playlistIdMap?.[track.id]
					invariant(entryId)

					void removeTrackEntryFromPlaylist(entryId)
				},
			},
		]
	}

	const getMenuItems = () => {
		const addToQueueMenuItem =
			tracks.tracksIds.length === 0
				? null
				: {
						label: m.playerAddToQueue(),
						action: () => {
							player.addToQueue(tracks.tracksIds)
						},
					}

		if (slug === 'playlists') {
			if (item.id === FAVORITE_PLAYLIST_ID) {
				return [addToQueueMenuItem]
			}

			return [addToQueueMenuItem, ...getPlaylistMenuItems(main, item as Playlist)]
		}

		return [
			addToQueueMenuItem,
			{
				label: m.libraryAddToPlaylist(),
				action: () => {
					main.addTrackToPlaylistDialogOpen = tracks.tracksIds
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					main.removeLibraryItemOpen = {
						id: item.id,
						name: item.name,
						storeName: slug,
					}
				},
			},
		]
	}

	const menuItems = $derived.by(() => {
		const items = getMenuItems().filter((item) => item !== null)

		return items.length > 0 ? items : null
	})

	const description = $derived(slug === 'playlists' && (item as Playlist).description)

	const artists = $derived(slug === 'albums' && formatArtists((item as AlbumData).artists))
</script>

{#if !isWideLayout.current}
	<Header title={data.singularTitle()} mode="fixed" />
{/if}

<div class="@container flex grow flex-col px-4 pb-4">
	<section
		class="relative flex w-full flex-col items-center justify-center gap-6 overflow-clip py-4 @2xl:min-h-60 @2xl:flex-row"
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

					<h1 class="text-headline-md">{formatNameOrUnknown(item.name)}</h1>
				</div>

				{#if description}
					<div class="text-body-lg">{description}</div>
				{/if}

				{#if artists}
					<div class="text-body-lg">
						{artists}
					</div>
				{/if}

				<div class="mt-1 text-onSurfaceVariant">
					{#if slug === 'albums' && (item as AlbumData).year !== UNKNOWN_ITEM}
						{(item as AlbumData).year} •
					{/if}

					{m.libraryTracksCount({ count: tracks.tracksIds.length })}
				</div>
			</div>

			<div class="mt-auto flex items-center gap-2 py-4 pr-2 pl-4">
				<Button
					kind="filled"
					class="my-1"
					disabled={tracks.tracksIds.length === 0}
					onclick={() => {
						player.playTrack(0, tracks.tracksIds)
					}}
				>
					{m.play()}
				</Button>

				<Button
					kind="flat"
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
