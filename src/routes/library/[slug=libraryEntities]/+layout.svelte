<script lang="ts">
	import { page } from '$app/stores'
	import type { LayoutParams } from './$types'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import { useRootLayout } from '$lib/app'
	import type { Snippet } from 'svelte'

const { children } = $props<{
	children: Snippet
}>()

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

<div class="page-layout">
	<div class="flex flex-col gap-8px">
		{#each navItems as item}
			<Button
				as="a"
				href={`/library/${item.slug}`}
				kind="blank"
				title={item.title}
				class="h-56px w-56px shrink-0 flex justify-center items-center rounded-full"
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

	<div>
		{@render children()}
	</div>
</div>

<style lang="postcss">
	.page-layout {
		display: grid;
		grid-template-columns: 96px 1fr;
	}
</style>
