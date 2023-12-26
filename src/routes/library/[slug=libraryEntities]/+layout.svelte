<script lang="ts">
	import { page } from '$app/stores'
	import type { LayoutParams } from './$types'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { IconType } from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Button from '$lib/components/Button.svelte'
	import { useRootLayout } from '$lib/app'
	import type { Snippet } from 'svelte'
	import { ripple } from '$lib/actions/ripple'

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
	<div class="flex flex-col gap-8px sticky top-16px h-max w-max">
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

	<div class="flex flex-col">
		<div class="ml-auto flex gap-8px">
			<button use:ripple class="flex interactable rounded-8px h-32px px-8px gap-4px items-center text-label-md">
				Name

				<Icon type="chevronDown" class="h-16px w-16px" />
			</button>

			<IconButton icon="backArrow" class="[--icon-size:20px]" />
			<!-- <button use:ripple class="flex interactable rounded-8px ">
				<Icon type="backArrow" />
			</button> -->
		</div>
		<div class="contain-paint w-full">
			{@render children()}
		</div>
	</div>
</div>

<style lang="postcss">
	.page-layout {
		display: grid;
		grid-template-columns: 96px 1fr;
	}
</style>
