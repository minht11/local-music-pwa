<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import type { RouteId } from '$app/types'
	import AlbumsListContainer from '$lib/components/AlbumsListContainer.svelte'
	import ArtistListContainer from '$lib/components/ArtistListContainer.svelte'
	import Button from '$lib/components/Button.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueriesDynamic } from '$lib/db/query/page-query.svelte.ts'
	import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
	import { useSetBottomBar } from '$lib/layout-bottom-bar.svelte.ts'
	import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists-actions.ts'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import Search from './Search.svelte'

	const { data, children } = $props()

	initPageQueriesDynamic(
		() => data.slug,
		() => data,
	)

	const main = useMainStore()

	const itemsIds = $derived(data.itemsIdsQuery.value)
	const slug = $derived(data.slug)
	const isHandHeldDevice = isMobile()

	interface NavItem {
		slug: typeof slug
		title: string
		icon: IconType
	}

	const navItems: NavItem[] = [
		{
			slug: 'tracks',
			title: m.tracks(),
			icon: 'musicNote',
		},
		{
			slug: 'albums',
			title: m.albums(),
			icon: 'album',
		},
		{
			slug: 'artists',
			title: m.artists(),
			icon: 'person',
		},
		{
			slug: 'playlists',
			title: m.playlists(),
			icon: 'playlist',
		},
	]

	const isWideLayout = $derived.by(data.isWideLayout)
	const layoutMode = $derived(data.layoutMode(isWideLayout, page.params.uuid))

	useSetBottomBar(() => layoutBottom)

	export const snapshot: Snapshot<string> = {
		capture: () => data.store.searchTerm,
		restore: (value) => {
			data.store.searchTerm = value
		},
	}
</script>

{#snippet navItemsSnippet(className: string)}
	{#each navItems as item}
		<Button
			as="a"
			href={`/library/${item.slug}`}
			kind="blank"
			tooltip={item.title}
			class={['flex shrink-0 items-center justify-center', className]}
		>
			<div
				class={[
					'flex items-center justify-center rounded-full p-2',
					item.slug === slug && 'bg-secondaryContainer text-onSecondaryContainer',
				]}
			>
				<Icon type={item.icon} />
			</div>
		</Button>
	{/each}
{/snippet}

{#snippet layoutBottom()}
	{#if isHandHeldDevice}
		<div
			class="pointer-events-auto grid h-16 w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-surfaceContainer sm:hidden"
		>
			{@render navItemsSnippet('h-full')}
		</div>
	{/if}
{/snippet}

{#if !(layoutMode === 'details' && !isWideLayout)}
	<div
		class={[
			'desktop-sidebar fixed z-1 mt-20 h-max w-max flex-col gap-2 [@media(max-height:500px)]:mt-2',
			isHandHeldDevice ? 'hidden sm:flex' : 'flex',
		]}
	>
		{@render navItemsSnippet('h-14 w-20')}
	</div>
{/if}

<ListDetailsLayout mode={layoutMode} class="mx-auto w-full max-w-[var(--library-max-width)] grow">
	{#snippet list(mode)}
		<div class={[isHandHeldDevice ? 'sm:pl-20' : 'pl-20', 'flex grow flex-col']}>
			<div class={[mode === 'both' && 'w-100', 'flex grow flex-col px-4']}>
				<Search name={data.pluralTitle()} sortOptions={data.sortOptions} store={data.store} />

				{#if slug === 'playlists'}
					<div class="mb-4 flex items-center justify-end">
						<Button
							kind="outlined"
							onclick={() => {
								main.createNewPlaylistDialogOpen = true
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
						{#if slug && itemsIds.length === 0}
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
							<TracksListContainer items={itemsIds} />
						{:else if slug === 'albums'}
							<AlbumsListContainer items={itemsIds} />
						{:else if slug === 'artists'}
							<ArtistListContainer items={itemsIds} />
						{:else if slug === 'playlists'}
							<PlaylistListContainer
								items={itemsIds}
								menuItems={{
									disabled: (playlist) => playlist.id === FAVORITE_PLAYLIST_ID,
									items: (playlist) => getPlaylistMenuItems(main, playlist),
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
				{@render children?.()}
			{/key}
		</div>
	{/snippet}
</ListDetailsLayout>

<style lang="postcss">
	@reference '../../../../app.css';

	:root {
		--library-max-width: --spacing(400);
	}
	.desktop-sidebar {
		left: max(0, (100% - var(--library-max-width)) / 2);
	}
</style>
