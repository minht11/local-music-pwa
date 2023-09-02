<script lang="ts">
	import { page } from '$app/stores'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import SlotContent from '$lib/components/slot/SlotContent.svelte'
	import IconButton from '$lib/components/IconButton.svelte'

	type LibrarySlug = 'tracks' | 'albums' | 'artists' | 'playlists'

	const slug = $page.params.slug as LibrarySlug

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
</script>

<SlotContent name="actions">
	<IconButton as="a" href="/search" icon="search" />
	<IconButton as="a" href="/settings" icon="moreVertical" />
</SlotContent>

<div>
	{#each navItems as item}
		<a
			href={`/library/${item.slug}`}
			title={item.title}
			class={item.slug === slug ? 'text-primary' : ''}
		>
			<Icon type={item.icon} />
		</a>
	{/each}
</div>

<slot />
