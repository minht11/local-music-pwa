<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
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
	import Search from './Search.svelte'

	const { data, children } = $props()

	initPageQueriesDynamic(
		() => data.storeName,
		() => data,
	)

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
	const layoutMode = $derived(data.layoutMode(isWideLayout, page.params.id))

	useSetBottomBar(() => layoutBottom)
</script>

{#snippet navItemsSnippet(className: string)}
	{#each navItems as item}
		<Button
			as="a"
			href={`/library/${item.slug}`}
			kind="blank"
			title={item.title}
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
	{#if data.isHandHeldDevice}
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
			data.isHandHeldDevice ? 'hidden sm:flex' : 'flex',
		]}
	>
		{@render navItemsSnippet('h-14 w-20')}
	</div>
{/if}

<ListDetailsLayout mode={layoutMode} class="mx-auto w-full max-w-[var(--library-max-width)] grow">
	{#snippet list(mode)}
		<div class={[data.isHandHeldDevice ? 'sm:pl-20' : 'pl-20', 'flex grow flex-col']}>
			<div class={[mode === 'both' && 'w-100', 'flex grow flex-col px-4']}>
				<Search name={data.pluralTitle} store={data.store} />

				{#if data.storeName === 'playlists'}
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

				{#if data.tracksCountQuery.value === 0 && data.storeName !== 'playlists'}
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
						{#if data.store.searchTerm && itemsIds.length === 0}
							<div class="relative m-auto flex flex-col items-center text-center">
								<Icon type="magnify" class="my-auto size-35 opacity-54" />

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
								menuItems={{
									disabled: (playlist) => playlist.id === FAVORITE_PLAYLIST_ID,
									items: (playlist) => getPlaylistMenuItems(main, playlist),
								}}
								onItemClick={({ playlist }) => {
									const shouldReplace = page.route.id === '/library/[slug=libraryEntities]/[id]'

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

<style>
	@reference '../../../app.css';

	:root {
		--library-max-width: --spacing(400);
	}
	.desktop-sidebar {
		left: max(0, (100% - var(--library-max-width)) / 2);
	}
</style>
