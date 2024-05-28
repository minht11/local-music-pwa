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
	import HeaderActions from './HeaderActions.svelte'
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
		const isWide = isWideLayout.value
		const hasEntityId = !!$page.params.id

		if (slug === 'tracks') {
			return 'list'
		}

		if (isWide) {
			return 'both'
		}

		if (hasEntityId) {
			return 'details'
		}

		return 'list'
	})

	const layout = useRootLayout()
	// @ts-expect-error snippet is defined
	layout.bottom = layoutBottom

	console.log('layoutMode', $page.url.pathname)
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

<ListDetailsLayout
	mode={layoutMode}
	gap={12}
	class="max-w-[var(--library-max-width)] w-full mx-auto grow"
>
	{#snippet list(mode)}
		<div class={clx(mode === 'both' && 'pr-12px', 'pl-96px')}>
			<div class={clx(mode === 'both' && 'w-400px')}>
				<Search {data} />

				<HeaderActions {data} />

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
		<div class="h-full rounded-24px pointer-events-auto bg-surfaceContainer mt-24px flex flex-col">
			{#key $page.url.pathname}
				{#if children}
					{@render children()}
				{:else}
					<div class="text-body-md w-max m-auto text-onSurfaceVariant">No item selected</div>
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
