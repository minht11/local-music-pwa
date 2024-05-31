<script lang="ts">
	import { page } from '$app/stores'
	import { useRootLayout } from '$lib/app'
	import Button from '$lib/components/Button.svelte'
	import ListDetailsLayout from '$lib/components/ListDetailsLayout.svelte'
	import AlbumsListContainer from '$lib/components/albums/AlbumsListContainer.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte.js'
	import type { LayoutParams } from './$types'
	import Search from './Search.svelte'

	const { data, children } = $props()

	const { store } = data

	store.hydrateQuery()
	const itemsIds = $derived(store.items)

	const slug = $derived(data.slug)

	type Slug = LayoutParams['slug']

	interface NavItem {
		// TODO. Remove playlists type
		slug: Slug
		title: string
		icon: IconType
	}

	const navItems = [
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
	] satisfies NavItem[]

	const isWideLayout = useMediaQuery('(min-width: 1154px)')

	const layoutMode = $derived.by(() => {
		if (slug === 'tracks') {
			return 'list'
		}

		if (isWideLayout.value) {
			return 'both'
		}

		if ($page.params.id) {
			return 'details'
		}

		return 'list'
	})

	const layout = useRootLayout()
	// @ts-expect-error snippet is defined
	layout.bottom = layoutBottom
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
		<div class="grid sm:hidden grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-surface w-full h-64px">
			{@render navItemsSnippet('h-full')}
		</div>
	{/if}
{/snippet}

{#if !(layoutMode === 'details' && !isWideLayout.value)}
	<div
		class={clx(
			'gap-8px fixed z-1 desktop-sidebar flex-col w-max h-max mt-64px',
			data.isHandHeldDevice ? 'hidden sm:flex' : 'flex',
		)}
	>
		{@render navItemsSnippet('h-56px w-80px')}
	</div>
{/if}

<ListDetailsLayout mode={layoutMode} class="max-w-[var(--library-max-width)] w-full mx-auto grow">
	{#snippet list(mode)}
		<div class={clx(mode === 'both' && 'pr-12px', 'pl-96px')}>
			<div class={clx(mode === 'both' && 'w-400px')}>
				<Search {store} />

				<div class={clx('w-full grow flex flex-col')}>
					{#if store.searchTerm && itemsIds.length === 0}
						<div class="text-body-md w-max m-auto text-onSurfaceVariant">No results found</div>
					{:else if store.storeName === 'tracks'}
						<TracksListContainer items={itemsIds} />
					{:else if store.storeName === 'albums'}
						<AlbumsListContainer items={itemsIds} />
					{/if}
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet details()}
		<div
			class={clx(
				'h-full rounded-24px pointer-events-auto flex flex-col @container',
				layoutMode === 'both' && 'bg-surfaceContainer mx-16px mt-16px',
			)}
		>
			{#key $page.url.pathname}
				{#if children}
					{@render children()}
				{:else}
					<div class="flex flex-col gap-16px items-center justify-center m-auto items-center">
						<Icon type="album" class="size-40 my-auto opacity-54" />

						<div class="flex flex-col relative">
							<div class="text-body-lg max-w-200px text-center">
								{m.librarySelectSomethingToBeShown()}
							</div>

							<!-- Down hand drawn arrow by kiddo from Noun Project (CC BY 3.0) -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 100 125"
								class="fill-current opacity-54 h-120px absolute -bottom-120px -left-24px"
							>
								<path
									d="M20.1 80.9c-.1.6-.2 2 .5 2 8.3.3 16.6 1 24.8 2.1.8.1 1.3-1 1.5-1.7.1-.5.4-2.1-.5-2.2-7.3-1-14.6-1.6-21.9-1.9 11.4-3.6 23-7.3 33-14 4.6-3.1 8.9-6.8 12.4-11.1 3.9-4.8 6.6-10.3 8.2-16.2 1.9-7.1 2.3-14.5 1.7-21.7 0-.6-.4-1.5-1.1-1-.7.5-1.1 1.7-1 2.6.4 5.9.3 12-1 17.8-1.2 5.4-3.4 10.3-6.8 14.7-6.8 8.7-16.5 14.5-26.5 18.6-5.4 2.2-10.9 4-16.5 5.8 2.7-4 4.7-8.5 5.9-13.2.1-.6.3-1.9-.5-2.2-.8-.2-1.3 1.2-1.5 1.7-1.6 6.5-5.1 12.4-10.1 17.1-.6.6-.9 1.9-.7 2.7 0 0 0 .1.1.1z"
								/>
							</svg>
						</div>
					</div>
				{/if}
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
