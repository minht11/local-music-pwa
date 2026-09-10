<script lang="ts">
	import { isMobile } from '$lib/helpers/utils/ua.ts'
	import type { LibraryStoreName } from '$lib/library/types.ts'
	import Button from './Button.svelte'
	import IconButton from './IconButton.svelte'
	import type { IconType } from './icon/Icon.svelte'
	import Icon from './icon/Icon.svelte'
	import type { LayoutMode } from './ListDetailsLayout.svelte'

	type Props = {
		activeSlug: LibraryStoreName
	} & (
		| { variant: 'bottom' }
		| {
				variant: 'rail'
				layoutMode: LayoutMode
				isWideLayout: boolean
		  }
	)

	interface NavItem {
		slug: LibraryStoreName
		title: string
		icon: IconType
	}

	const props: Props = $props()
	const main = useMainStore()
	const isHandHeldDevice = isMobile()

	const navItems: NavItem[] = $derived([
		{ slug: 'tracks', title: m.tracks(), icon: 'musicNote' },
		{ slug: 'albums', title: m.albums(), icon: 'album' },
		{ slug: 'artists', title: m.artists(), icon: 'person' },
		{ slug: 'playlists', title: m.playlists(), icon: 'playlist' },
	])
</script>

{#snippet items(className: string)}
	{#each navItems as item}
		<Button
			as="a"
			href={`/library/${item.slug}`}
			kind="blank"
			tooltip={item.title}
			class={['flex shrink-0 items-center justify-center', className]}
		>
			<div
				class={[
					'flex items-center justify-center rounded-full p-2',
					item.slug === props.activeSlug && 'bg-secondaryContainer text-onSecondaryContainer',
				]}
			>
				<Icon type={item.icon} />
			</div>
		</Button>
	{/each}
{/snippet}

{#if props.variant === 'bottom'}
	{#if isHandHeldDevice}
		<div
			class="pointer-events-auto grid h-[calc(--spacing(16)+env(safe-area-inset-bottom))] w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-surfaceContainer pb-[env(safe-area-inset-bottom)] sm:hidden active-view-regular:view-name-[bottom-bar]"
		>
			{@render items('h-full')}
		</div>
	{/if}
{:else if props.layoutMode !== 'details'}
	<div
		class={[
			'desktop-sidebar fixed z-1 mt-20 h-max w-max flex-col items-center gap-2 [@media(max-height:500px)]:mt-2',
			isHandHeldDevice ? 'hidden sm:flex' : 'flex',
		]}
	>
		{@render items('h-14 w-20')}

		{#if (props.activeSlug === 'albums' || props.activeSlug === 'artists') && props.isWideLayout}
			<IconButton
				icon="sidePanel"
				tooltip={main.librarySplitLayoutEnabled
					? m.librarySplitViewDisable()
					: m.librarySplitViewEnable()}
				class={['mt-4', main.librarySplitLayoutEnabled && 'rotate-180']}
				onclick={() => {
					main.librarySplitLayoutEnabled = !main.librarySplitLayoutEnabled
				}}
			/>
		{/if}
	</div>
{/if}
