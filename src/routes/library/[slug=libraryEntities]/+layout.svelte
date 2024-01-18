<script lang="ts">
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import type { LayoutParams } from './$types'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import { useRootLayout } from '$lib/app'
	import Menu, { getMenuId } from '$lib/components/Menu.svelte'
	import { ripple } from '$lib/actions/ripple.js'
	import Separator from '$lib/components/Separator.svelte'

	const { data, children } = $props()

	type LibrarySlug = LayoutParams['slug']

	const slug = $derived($page.params.slug as LayoutParams['slug'])

	interface NavItem {
		slug: LibrarySlug
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

	const menuId = getMenuId()

	const layout = useRootLayout()
	// @ts-ignore
	layout.actions = layoutActions
	// @ts-ignore
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

{#snippet layoutActions()}
	<input
		type="text"
		placeholder="Search tracks"
		class="h-40px w-240px pl-8px placeholder:text-onSurface/54 text-body-md bg-transparent focus:outline-none"
	/>

	<Separator vertical class="h-24px my-auto" />

	<button
		popovertarget={menuId}
		use:ripple
		class="flex interactable w-96px rounded-8px h-40px pl-12px pr-4px gap-4px items-center text-label-md"
	>
		Name

		<Icon type="menuDown" class="h-16px w-16px ml-auto" />
	</button>

	<IconButton as="a" href="/search" icon="sortAscending" />

	<Separator vertical class="h-24px my-auto" />

	<!-- <IconButton as="a" href="/search" icon="search" /> -->
	<IconButton icon="moreVertical" popovertarget={menuId} />

	<Menu
		id={menuId}
		class="w-100px"
		matchWidth={false}
		items={[
			{
				label: 'Settings',
				action: () => {
					goto('/settings')
				},
			},
			{
				label: 'About',
				action: () => {
					goto('/about')
				},
			},
		]}
	/>
{/snippet}

{#snippet layoutBottom()}
	{#if data.isHandHeldDevice}
		<div
			class="grid sm:hidden grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-surface tonal-elevation-2 w-full h-64px"
		>
			{@render navItemsSnippet('h-full')}
		</div>
	{/if}
{/snippet}

<div
	class={clx(
		'gap-8px fixed desktop-sidebar flex-col w-max h-max',
		data.isHandHeldDevice ? 'hidden sm:flex' : 'flex',
	)}
>
	{@render navItemsSnippet('h-56px w-80px')}
</div>

<div class={clx('w-full', data.isHandHeldDevice ? 'sm:pl-96px' : 'pl-96px')}>
	{@render children()}
</div>

<style>
	.desktop-sidebar {
		left: max(0px, (100% - 1280px) / 2);
	}
</style>
