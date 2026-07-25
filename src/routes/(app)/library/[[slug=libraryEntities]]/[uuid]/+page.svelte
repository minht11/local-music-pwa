<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity'
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Header from '$lib/components/Header.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import MenuButton from '$lib/components/MenuButton.svelte'
	import TracksListContainer, {
		type TrackListRow,
	} from '$lib/components/tracks/TracksListContainer.svelte'
	import type { TrackRowLocator } from '$lib/components/tracks/use-track-menu-items.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import {
		createManagedArtwork,
		getAlbumManagedArtworkSource,
	} from '$lib/helpers/create-managed-artwork.svelte.ts'
	import { formatArtists, formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import type { AlbumData, TrackData } from '$lib/library/get/value.ts'
	import {
		FAVORITE_PLAYLIST_ID,
		removeTrackEntryFromPlaylist,
	} from '$lib/library/playlists-actions.ts'
	import { type Playlist, UNKNOWN_ITEM } from '$lib/library/types.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import type { QueueOrigin } from '$lib/stores/player/queue.svelte.ts'

	const { data } = $props()

	const main = useMainStore()
	const dialogs = useDialogsStore()
	const player = usePlayer()

	initPageQueries(() => data)

	const item = $derived(data.itemQuery.value)
	const tracks = $derived(data.tracksQuery.value)
	const slug = $derived(data.slug)

	const isFavoritesView = $derived(slug === 'playlists' && item.id === FAVORITE_PLAYLIST_ID)

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
			const album = item as AlbumData
			return getAlbumManagedArtworkSource(album)
		}

		return null
	})

	const isWideLayout = new MediaQuery('(min-width: 1154px)')

	// Rows carry their identity: `PlaylistEntry.id` for playlists (exact under
	// duplicate tracks), the track id itself elsewhere (one row per track).
	const trackRowAt = (index: number): TrackListRow => {
		const entry = tracks.entries?.[index]
		if (entry) {
			return { type: 'track', entryId: entry.entryId, trackId: entry.trackId }
		}

		const id = tracks.tracksIds[index]
		invariant(id !== undefined)

		return { type: 'track', entryId: id, trackId: id }
	}

	// Only used on playlist views, where a row's `entryId` is the `PlaylistEntry` id.
	const playlistTrackMenuItems = (_track: TrackData, { entryId }: TrackRowLocator) => {
		if (isFavoritesView) {
			return []
		}

		return [
			{
				label: m.libraryTrackRemoveFromPlaylist(),
				action: () => {
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
							player.queue.enqueue(tracks.tracksIds, 'last')
						},
					}

		if (slug === 'playlists') {
			if (isFavoritesView) {
				return [addToQueueMenuItem]
			}

			return [addToQueueMenuItem, ...getPlaylistMenuItems(dialogs, item as Playlist)]
		}

		return [
			addToQueueMenuItem,
			{
				label: m.libraryAddToPlaylist(),
				action: () => {
					dialogs.openDialog('addToPlaylist', tracks.tracksIds)
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					dialogs.openDialog('removeFromLibrary', {
						type: 'single',
						id: item.id,
						name: item.name,
						storeName: slug,
					})
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

	const queueSourceTypes = {
		albums: 'album',
		artists: 'artist',
		playlists: 'playlist',
	} as const

	const queueSource: QueueOrigin = $derived({
		type: queueSourceTypes[slug],
		name: formatNameOrUnknown(item.name),
	})
</script>

{#if !(isWideLayout.current && main.librarySplitLayoutEnabled)}
	<Header title={data.singularTitle()} />
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
			class="relative z-0 flex size-full flex-col overflow-clip rounded-2xl bg-surfaceContainerHigh"
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
					<div class="grid w-full overflow-hidden text-body-lg">
						<div class="truncate">
							{artists}
						</div>
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
						player.playFrom(0, tracks.tracksIds, queueSource)
					}}
				>
					{m.play()}
				</Button>

				<Button
					kind="flat"
					class="my-1 mr-auto"
					disabled={tracks.tracksIds.length === 0}
					onclick={() => {
						player.playFrom('shuffle', tracks.tracksIds, queueSource)
					}}
				>
					{m.shuffle()}
					<Icon type="shuffle" />
				</Button>

				{#if menuItems}
					<MenuButton tooltip={m.more()} menuItems={() => menuItems} />
				{/if}
			</div>
		</div>
	</section>

	<TracksListContainer
		count={tracks.tracksIds.length}
		rowAt={trackRowAt}
		trackCount={tracks.tracksIds.length}
		activeRow={{ by: 'trackId', trackId: player.queue.current?.trackId ?? null }}
		onItemClick={({ index }) => {
			player.playFrom(index, tracks.tracksIds, queueSource)
		}}
		predefinedMenuItems={{
			disableViewAlbum: slug === 'albums',
			disableViewArtist: slug === 'artists',
			disableAddToFavorites: isFavoritesView,
			enableMultiRemoveFromFavorites: isFavoritesView,
		}}
		menuItems={slug === 'playlists' ? playlistTrackMenuItems : undefined}
	/>
</div>
