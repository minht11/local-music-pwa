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
</script>

{#snippet layoutActions()}
	<IconButton as="a" href="/search" icon="search" />
	<IconButton as="a" href="/settings" icon="moreVertical" />
{/snippet}

<div
	class={clx(
		'gap-8px fixed',
		data.isHandHeldDevice
			? 'grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] bottom-0 inset-x-0 bg-surface tonal-elevation-2 w-full h-64px z-10 justify-between'
			: 'flex left-16px flex-col w-max h-max',
	)}
>
	{#each navItems as item}
		<Button
			as="a"
			href={`/library/${item.slug}`}
			kind="blank"
			title={item.title}
			class={clx(
				'shrink-0 flex justify-center items-center',
				data.isHandHeldDevice ? 'h-full rounded-0' : 'h-56px w-56px rounded-full',
			)}
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
</div>

<div class={clx('w-full', !data.isHandHeldDevice && 'pl-96px')}>
	{@render children()}
</div>
