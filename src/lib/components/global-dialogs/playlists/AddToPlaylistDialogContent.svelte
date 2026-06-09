<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import { getDatabase } from '$lib/db/database.ts'
	import { createInlineQuery } from '$lib/db/query/inline-query.svelte'
	import { foldForSearch } from '$lib/helpers/utils/text.ts'
	import { getLibraryItemIds } from '$lib/library/get/ids'
	import { dbBatchModifyPlaylistsSelection } from '$lib/library/playlists-actions'

	interface Props {
		trackIds: readonly number[]
		children: Snippet<[{ save: () => Promise<void> }]>
	}

	const { trackIds, children }: Props = $props()

	let searchTerm = $state('')

	const getPlaylists = createInlineQuery({
		key: () => [searchTerm],
		fetcher: () =>
			getLibraryItemIds('playlists', {
				sort: 'createdAt',
				order: 'desc',
				searchTerm: foldForSearch(searchTerm.trim()),
				searchFn: (p, term) => foldForSearch(p.name).includes(term),
			}),
		onDatabaseChange: (changes) => {
			for (const change of changes) {
				if (change.storeName === 'playlists') {
					return true
				}
			}

			return false
		},
	})

	const getInitialTrackPlaylists = async () => {
		const selectionMap = new SvelteMap</* playlist id */ number, SelectionStatus>()

		const firstTrackId = trackIds.at(0)
		// In case there are multiple track ids, we treat as if there are no items added in the playlist
		if (trackIds.length > 1 || !firstTrackId) {
			return selectionMap
		}

		const db = await getDatabase()
		const items = await db.getAllFromIndex('playlistEntries', 'trackId', firstTrackId)

		for (const playlistEntry of items) {
			selectionMap.set(playlistEntry.playlistId, 'added-already')
		}

		return selectionMap
	}

	const selection = await getInitialTrackPlaylists()

	type SelectionStatus = 'added-already' | 'add' | 'remove'

	const isTrackInPlaylist = (playlistId: number) => {
		const selectionState = selection.get(playlistId)

		return selectionState === 'added-already' || selectionState === 'add'
	}

	const toggleSelection = (playlistId: number) => {
		const selectionState = selection.get(playlistId)

		if (selectionState === 'added-already') {
			selection.set(playlistId, 'remove')
		} else if (selectionState === 'add') {
			selection.delete(playlistId)
		} else if (selectionState === 'remove') {
			selection.set(playlistId, 'added-already')
		} else {
			selection.set(playlistId, 'add')
		}
	}

	const dbSave = () => {
		const playlistsIdsRemoveFrom: number[] = []
		const playlistsIdsAddTo: number[] = []
		for (const [playlistId, status] of selection) {
			if (status === 'remove') {
				playlistsIdsRemoveFrom.push(playlistId)
			} else if (status === 'add') {
				playlistsIdsAddTo.push(playlistId)
			}
		}

		return dbBatchModifyPlaylistsSelection({
			trackIds,
			playlistsIdsAddTo,
			playlistsIdsRemoveFrom,
		})
	}

	const save = async () => {
		try {
			const changed = await dbSave()
			if (changed) {
				snackbar({ id: 'playlists-updated', message: m.libraryPlaylistsUpdated() })
			}
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
</script>

<div class="p-4">
	<TextField bind:value={searchTerm} name="search" placeholder={m.librarySearch()} />
</div>

<Separator />
<ScrollContainer class="max-h-100 grow overflow-auto px-2 py-4">
	<PlaylistListContainer
		items={await getPlaylists()}
		onItemClick={(item) => {
			toggleSelection(item.playlist.id)
		}}
	>
		{#snippet icon(playlist)}
			{@const isInPlaylist = isTrackInPlaylist(playlist.id)}
			<div
				class={[
					'flex size-6 items-center justify-center rounded-full border-2',
					isInPlaylist ? 'border-primary bg-primary text-onPrimary' : 'border-neutral',
				]}
			>
				{#if isInPlaylist}
					<Icon type="check" />
				{/if}
			</div>
		{/snippet}
	</PlaylistListContainer>
</ScrollContainer>

{@render children({ save })}
