<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import type { RouteId } from '$app/types'
	import { ripple } from '$lib/attachments/ripple.ts'
	import {
		createManagedArtwork,
		getAlbumManagedArtworkSource,
	} from '$lib/helpers/create-managed-artwork.svelte.ts'
	import { dbGetAlbumTracksIdsByName, dbGetArtistTracksIdsByName } from '$lib/library/get/ids'
	import type { AlbumData, ArtistData } from '$lib/library/get/value'
	import { createLibraryValueQuery } from '$lib/library/get/value-queries'
	import Artwork from '../Artwork.svelte'
	import PlayPauseIcon from '../animated-icons/PlayPauseIcon.svelte'

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
	const dialogs = useDialogsStore()
	const player = usePlayer()

	const query = createLibraryValueQuery(
		() => type,
		() => itemId,
	)

	const { value: item } = $derived(query)

	const artworkSrc = createManagedArtwork(() => {
		if (type === 'albums' && item) {
			const album = item as AlbumData
			return getAlbumManagedArtworkSource(album)
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

	const dbGetAlbumOrArtistTrackIdsByName = (name: string) => {
		if (type === 'albums') {
			return dbGetAlbumTracksIdsByName(name)
		}

		return dbGetArtistTracksIdsByName(name)
	}

	const menuItems = () => {
		if (!(item && linkProps)) {
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
				label: m.playerAddToQueue(),
				action: async () => {
					try {
						const tracksIds = await dbGetAlbumOrArtistTrackIdsByName(item.name)

						player.addToQueue(tracksIds)
					} catch (error) {
						snackbar.unexpectedError(error)
					}
				},
			},
			{
				label: m.libraryAddToPlaylist(),
				action: async () => {
					try {
						const tracksIds = await dbGetAlbumOrArtistTrackIdsByName(item.name)

						dialogs.openDialog('addToPlaylist', tracksIds)
					} catch (error) {
						snackbar.unexpectedError(error)
					}
				},
			},
			{
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					dialogs.openDialog('removeFromLibrary', {
						type: 'single',
						id: item.id,
						name: item.name,
						storeName: type,
					})
				},
			},
		]
	}

	const playItem = async () => {
		try {
			invariant(item)

			const tracksIds = await dbGetAlbumOrArtistTrackIdsByName(item.name)
			if (tracksIds.length === 0) {
				return
			}

			player.playTrack(0, tracksIds)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<div
	{...props}
	role="listitem"
	class={[className, 'library-grid-item relative rounded-lg bg-surfaceContainerHigh']}
	oncontextmenu={(e) => {
		e.preventDefault()
		menu.showFromEvent(e, menuItems(), {
			anchor: false,
			position: { top: e.y, left: e.x },
		})
	}}
>
	<a
		{@attach ripple()}
		class="library-grid-link interactable flex flex-col rounded-[inherit]"
		href={linkProps?.href}
		data-sveltekit-replacestate={linkProps?.shouldReplace}
	>
		<div class="relative aspect-square w-full">
			<Artwork
				src={artworkSrc()}
				fallbackIcon={type === 'albums' ? 'album' : 'person'}
				class="absolute inset-0 w-full rounded-[inherit]"
			/>
		</div>

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

	<div
		{@attach ripple()}
		role="button"
		tabindex={0}
		aria-label={m.playerPlay()}
		class="play-overlay-button interactable pointer-events-auto absolute top-2 right-2 z-1 flex size-10 items-center justify-center rounded-lg bg-surfaceContainerHigh text-onSurface"
		onpointerdown={(e) => {
			e.stopPropagation()
		}}
		onclick={async (e) => {
			e.preventDefault()
			e.stopPropagation()
			await playItem()
		}}
		onkeydown={async (e) => {
			if (e.key !== 'Enter' && e.key !== ' ') {
				return
			}

			e.preventDefault()
			e.stopPropagation()
			await playItem()
		}}
	>
		<PlayPauseIcon playing={false} />
	</div>
</div>

<style>
	.library-grid-item:has(.play-overlay-button:is(:hover, :focus-visible, :active))
		.library-grid-link {
		--animation-scale: 1;
		--overlay-bg: transparent;
	}
</style>
