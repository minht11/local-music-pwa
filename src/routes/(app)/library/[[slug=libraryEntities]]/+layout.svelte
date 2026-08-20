<script lang="ts" module>
	import type { Snapshot } from '@sveltejs/kit'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import type { RouteId } from '$app/types'
	import AlbumsListContainer from '$lib/components/AlbumsListContainer.svelte'
	import ArtistListContainer from '$lib/components/ArtistListContainer.svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import LibraryNavigation from '$lib/components/LibraryNavigation.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { createTrackRowsSource, trackIdRows } from '$lib/components/tracks/track-rows.svelte.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { isMobile } from '$lib/helpers/utils/ua.ts'
	import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists-actions.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import Search from './Search.svelte'
</script>

<script lang="ts">
	const { data, children } = $props()

	initPageQueries(() => data)

	const main = useMainStore()
	const dialogs = useDialogsStore()

	const itemsIds = $derived(data.itemsIdsQuery.value)
	const slug = $derived(data.slug)
	const isHandHeldDevice = isMobile()

	// Only read on the tracks slug, where `itemsIds` are track ids.
	const allTracksRows = trackIdRows(() => itemsIds)
	const allTracksSource = createTrackRowsSource(() => allTracksRows, {
		queueOrigin: () => ({ type: 'tracks', name: m.tracks() }),
	})

	const isWideLayout = $derived(data.isWideLayout())
	const layoutMode = $derived(
		data.layoutMode(main.librarySplitLayoutEnabled, isWideLayout, page.params.uuid),
	)

	export const snapshot: Snapshot<string> = {
		capture: () => data.store.searchTerm,
		restore: (value) => {
			data.store.searchTerm = value
		},
	}
</script>

<LibraryNavigation variant="rail" activeSlug={slug} {layoutMode} {isWideLayout} />

<ListDetailsLayout mode={layoutMode} class="mx-auto w-full max-w-(--app-max-content-width) grow">
	{#snippet list(mode)}
		<div class={[isHandHeldDevice ? 'sm:pl-20' : 'pl-20', 'flex grow flex-col']}>
			<div class={[mode === 'both' && 'w-100', 'flex grow flex-col px-4']}>
				<Search name={data.pluralTitle()} sortOptions={data.sortOptions} store={data.store} />

				{#if slug === 'playlists'}
					<div class="mb-4 flex items-center justify-end">
						<Button
							kind="outlined"
							onclick={() => {
								dialogs.openDialog('newPlaylist')
							}}
						>
							<Icon type="plus" />

							{m.libraryNewPlaylist()}
						</Button>
					</div>
				{/if}

				{#if data.tracksCountQuery.value === 0 && slug !== 'playlists'}
					<div class="my-auto flex flex-col items-center text-center">
						<div class="mb-1 text-title-lg">{m.libraryEmpty()}</div>
						{m.libraryStartByAdding()}
						<Button as="a" href="/settings" class="mt-4">
							<Icon type="plus" />
							{m.libraryImportTracks()}
						</Button>
					</div>
				{:else}
					<div class={['flex w-full grow flex-col']}>
						{#if itemsIds.length === 0}
							<div class="relative m-auto flex flex-col items-center text-center">
								<Icon type="magnify" class="my-auto size-35 opacity-54" />

								<div class="text-body-lg">
									{m.libraryNoResults()}
								</div>
								<div>
									{m.libraryNoResultsExplanation()}
								</div>
							</div>
						{:else if slug === 'tracks'}
							<TracksListContainer source={allTracksSource} />
						{:else if slug === 'albums'}
							<AlbumsListContainer items={itemsIds} />
						{:else if slug === 'artists'}
							<ArtistListContainer items={itemsIds} />
						{:else if slug === 'playlists'}
							<PlaylistListContainer
								items={itemsIds}
								menuItems={{
									disabled: (playlist) => playlist.id === FAVORITE_PLAYLIST_ID,
									items: (playlist) => getPlaylistMenuItems(dialogs, playlist),
								}}
								onItemClick={({ playlist }) => {
									const detailsViewId: RouteId = '/(app)/library/[[slug=libraryEntities]]/[uuid]'
									const shouldReplace = page.route.id === detailsViewId

									void goto(`/library/playlists/${playlist.uuid}`, { replaceState: shouldReplace })
								}}
							/>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/snippet}

	{#snippet details()}
		<div
			class={[
				'pointer-events-auto flex h-full flex-col rounded-3xl',
				layoutMode === 'both' && 'mx-4 mt-4 border border-primary/5 bg-surfaceContainer',
			]}
		>
			{#key page.url.pathname}
				{@render children()}
			{/key}
		</div>
	{/snippet}
</ListDetailsLayout>
