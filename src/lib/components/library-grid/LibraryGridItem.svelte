<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { ripple } from '$lib/actions/ripple.ts'
	import type { QueryResult } from '$lib/db/query/query.ts'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte.ts'
	import type { AlbumData, ArtistData } from '$lib/library/get/value'
	import { createAlbumQuery, createArtistQuery } from '$lib/library/get/value-queries'
	import type { RouteId } from '$lib/view-transitions'
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

	type Value = LibraryGridItemValue<Type>

	const query = (
		type === 'albums' ? createAlbumQuery(() => itemId) : createArtistQuery(() => itemId)
	) as QueryResult<Value>

	const artworkSrc = createManagedArtwork(() => {
		if (type === 'albums') {
			return query.status === 'loaded' ? (query.value as AlbumData).image : undefined
		}

		return undefined
	})

	const clickHandler = () => {
		if (query.value) {
			const detailsViewId: RouteId = '/(app)/library/[slug=libraryEntities]/[uuid]'
			const shouldReplace = page.route.id === detailsViewId

			goto(`/library/${type}/${query.value.uuid}`, { replaceState: shouldReplace })
		}
	}
</script>

<div
	use:ripple
	{...props}
	role="listitem"
	class={[className, 'interactable flex flex-col rounded-lg bg-surfaceContainerHigh']}
	onclick={clickHandler}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			clickHandler()
		}
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
		{:else if query.value}
			{@render children(query.value)}
		{/if}
	</div>
</div>
