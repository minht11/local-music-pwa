<script lang="ts">
	import { page } from '$app/stores'
	import type { LayoutParams } from './$types'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import { useRootLayout } from '$lib/app'

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
	<IconButton as="a" href="/search" icon="search" />
	<IconButton as="a" href="/settings" icon="moreVertical" />
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
		'gap-8px fixed left-0 flex-col w-max h-max',
		data.isHandHeldDevice ? 'hidden sm:flex' : 'flex',
	)}
>
	{@render navItemsSnippet('h-56px w-80px')}
</div>

<div class={clx('w-full', data.isHandHeldDevice ? 'sm:pl-96px' : 'pl-96px')}>
	{@render children()}
</div>
