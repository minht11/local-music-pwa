<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import Button from '$lib/components/Button.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import AlbumsListContainer from '$lib/components/albums/AlbumsListContainer.svelte'
	import ArtistListContainer from '$lib/components/entities/artists/ArtistListContainer.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { initPageQueriesDynamic } from '$lib/db/query.svelte.js'
	import { useSetBottomBar } from '$lib/layout-bottom-bar.svelte.ts'
	import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte'
	import { getPlaylistMenuItems } from '$lib/menu-actions/playlists.ts'
	import { useMainStore } from '$lib/stores/main-store.svelte.ts'
	import Search from './Search.svelte'

	const { data, children } = $props()

	initPageQueriesDynamic(
		() => data.storeName,
		() => data,
	)

	// TODO. Look into if cleanup is done
	const main = useMainStore()

	const itemsIds = $derived(data.itemsQuery.value)

	const slug = $derived(data.slug)

	interface NavItem {
		slug: typeof slug
		title: string
		icon: IconType
	}

	const navItems: NavItem[] = [
		{
			slug: 'tracks',
			title: 'Tracks',
			icon: 'musicNote',
		},
		{
			slug: 'albums',
			title: 'Albums',
			icon: 'album',
		},
		{
			slug: 'artists',
			title: 'Artists',
			icon: 'person',
		},
		{
			slug: 'playlists',
			title: 'Playlists',
			icon: 'playlist',
		},
	]

	const isWideLayout = $derived.by(data.isWideLayout)
	const layoutMode = $derived(data.layoutMode(isWideLayout, $page.params.id))

	useSetBottomBar(() => layoutBottom)
</script>

{#snippet navItemsSnippet(className: string)}
	{#each navItems as item}
		<Button
			as="a"
			href={`/library/${item.slug}`}
			kind="blank"
			title={item.title}
			class={clx('shrink-0 flex justify-center items-center', className)}
		>
			<div
				class={clx(
					'flex items-center justify-center p-8px rounded-full',
					item.slug === slug && 'bg-secondaryContainer text-onSecondaryContainer',
				)}
			>
				<Icon type={item.icon} />
			</div>
		</Button>
	{/each}
{/snippet}

{#snippet layoutBottom()}
	{#if data.isHandHeldDevice}
		<div
			class="pointer-events-auto grid sm:hidden grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-surfaceContainer w-full h-64px"
		>
			{@render navItemsSnippet('h-full')}
		</div>
	{/if}
{/snippet}

{#if !(layoutMode === 'details' && !isWideLayout)}
	<div
		class={clx(
			'gap-8px fixed z-1 desktop-sidebar flex-col w-max h-max mt-80px [@media(max-height:500px)]:mt-8px',
			data.isHandHeldDevice ? 'hidden sm:flex' : 'flex',
		)}
	>
		{@render navItemsSnippet('h-56px w-80px')}
	</div>
{/if}

<ListDetailsLayout mode={layoutMode} class="max-w-[var(--library-max-width)] w-full mx-auto grow">
	{#snippet list(mode)}
		<div class={clx(data.isHandHeldDevice ? 'sm:pl-80px' : 'pl-80px', 'flex flex-col grow')}>
			<div class={clx(mode === 'both' && 'w-400px', 'px-16px grow flex flex-col')}>
				<Search name={data.pluralTitle} store={data.store} />

				{#if data.storeName === 'playlists'}
					<div class="flex items-center justify-end mb-16px">
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

				{#if data.tracksCountQuery.value === 0 && data.storeName !== 'playlists'}
					<div class="flex flex-col items-center my-auto text-center">
						<div class="text-title-lg mb-4px">{m.libraryEmpty()}</div>
						{m.libraryStartByAdding()}
						<Button as="a" href="/settings" class="mt-16px">
							<Icon type="plus" />
							{m.libraryImportTracks()}
						</Button>
					</div>
				{:else}
					<div class={clx('w-full grow flex flex-col')}>
						{#if data.store.searchTerm && itemsIds.length === 0}
							<div class="flex flex-col relative text-center items-center m-auto">
								<Icon type="magnify" class="size-140px my-auto opacity-54" />

								<div class="text-body-lg">
									{m.libraryNoResults()}
								</div>
								<div>
									{m.libraryNoResultsExplanation()}
								</div>
							</div>
						{:else if data.storeName === 'tracks'}
							<TracksListContainer items={itemsIds} />
						{:else if data.storeName === 'albums'}
							<AlbumsListContainer items={itemsIds} />
						{:else if data.storeName === 'artists'}
							<ArtistListContainer items={itemsIds} />
						{:else if data.storeName === 'playlists'}
							<PlaylistListContainer
								items={itemsIds}
								menuItems={(playlist) =>
									// TODO. Hide the menu items for the favorite playlist
									playlist.id === FAVORITE_PLAYLIST_ID ? [] : getPlaylistMenuItems(main, playlist)}
								onItemClick={({ playlist }) => {
									const shouldReplace = $page.route.id === '/library/[slug=libraryEntities]/[id]'

									void goto(`/library/playlists/${playlist.id}`, { replaceState: shouldReplace })
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
			class={clx(
				'h-full rounded-24px pointer-events-auto flex flex-col',
				layoutMode === 'both' && 'bg-surfaceContainer mx-16px mt-16px border border-primary/5',
			)}
		>
			{#key $page.url.pathname}
				{@render children?.()}
			{/key}
		</div>
	{/snippet}
</ListDetailsLayout>

<style>
	:root {
		--library-max-width: 1600px;
	}
	.desktop-sidebar {
		left: max(0px, (100% - var(--library-max-width)) / 2);
	}
</style>
