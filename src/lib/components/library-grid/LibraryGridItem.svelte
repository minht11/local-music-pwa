<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import type { RouteId } from '$app/types'
	import { ripple } from '$lib/attachments/ripple.ts'
	import type { QueryResult } from '$lib/db/query/query.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte.ts'
	import type { AlbumData, ArtistData } from '$lib/library/get/value'
	import { createAlbumQuery, createArtistQuery } from '$lib/library/get/value-queries'
	import { removeAlbum, removeArtist } from '$lib/library/remove.ts'
	import Artwork from '../Artwork.svelte'

	export type LibraryGridItemType = 'albums' | 'artists'

	export type LibraryGridItemValue<Type extends LibraryGridItemType> = {
		albums: AlbumData
		artists: ArtistData
	}[Type]

	export interface LibraryItemGridItemProps<Type extends LibraryGridItemType> {
		itemId: number
		type: Type
		class: ClassValue
		style: string
		children: Snippet<[LibraryGridItemValue<Type>]>
	}
</script>

<script lang="ts" generics="Type extends LibraryGridItemType">
	const {
		type,
		itemId,
		class: className,
		children,
		...props
	}: LibraryItemGridItemProps<Type> = $props()

	const menu = useMenu()

	type Value = LibraryGridItemValue<Type>

	const query = (
		type === 'albums' ? createAlbumQuery(() => itemId) : createArtistQuery(() => itemId)
	) as QueryResult<Value>
	const { value: item } = $derived(query)

	const artworkSrc = createManagedArtwork(() => {
		if (type === 'albums') {
			return item ? (item as AlbumData).image : undefined
		}

		return undefined
	})

	const linkProps = $derived.by(() => {
		const item = query.value
		if (!item) {
			return null
		}

		const detailsViewId: RouteId = '/(app)/library/[[slug=libraryEntities]]/[uuid]'
		const shouldReplace = page.route.id === detailsViewId

		const resolvedHref = resolve('/(app)/library/[[slug=libraryEntities]]/[uuid]', {
			slug: type,
			uuid: item.uuid,
		})

		return {
			href: resolvedHref,
			shouldReplace,
		}
	})

	const menuItems = () => {
		if (!item || !linkProps) {
			return []
		}

		return [
			{
				label: m.libraryViewDetails(),
				action: () => {
					goto(linkProps.href, { replaceState: linkProps.shouldReplace })
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					if (type === 'albums') {
						void removeAlbum(item.id)
					} else if (type === 'artists') {
						void removeArtist(item.id)
					}
				},
			},
		]
	}
</script>

<a
	{@attach ripple()}
	{...props}
	role="listitem"
	class={[className, 'interactable flex flex-col rounded-lg bg-surfaceContainerHigh']}
	href={linkProps?.href}
	data-sveltekit-replacestate={linkProps?.shouldReplace}
	oncontextmenu={(e) => {
		e.preventDefault()
		menu.showFromEvent(e, menuItems(), {
			anchor: false,
			position: { top: e.y, left: e.x },
		})
	}}
>
	<Artwork src={artworkSrc()} fallbackIcon="person" class="w-full rounded-[inherit]" />

	<div
		class="flex h-18 w-full flex-col justify-center overflow-hidden px-2 text-center text-onSurfaceVariant"
	>
		{#if query.loading}
			<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
			<div class="h-1 w-1/8 rounded-xs bg-onSurface/20"></div>
		{:else if query.error}
			{m.errorUnexpected()}
		{:else if item}
			{@render children(item)}
		{/if}
	</div>
</a>
