<script lang="ts">
	import { untrack } from 'svelte'
	import { SvelteMap } from 'svelte/reactivity'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlaylistListContainer from '$lib/components/playlists/PlaylistListContainer.svelte'
	import ScrollContainer from '$lib/components/ScrollContainer.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar'
	import TextField from '$lib/components/TextField.svelte'
	import { getDatabase } from '$lib/db/database.ts'
	import { createQuery } from '$lib/db/query/query.ts'
	import { getLibraryItemIds } from '$lib/library/get/ids'
	import { createLibraryItemKeysQuery } from '$lib/library/get/ids-queries'
	import { dbBatchModifyPlaylistsSelection } from '$lib/library/playlists-actions'

	interface Props {
		trackIds: number[]
		children: Snippet<[{ save: () => Promise<void> }]>
	}

	const { trackIds, children }: Props = $props()

	let searchTerm = $state('')

	const playlistsIdsQuery = createLibraryItemKeysQuery('playlists', {
		key: () => [searchTerm],
		fetcher: () =>
			getLibraryItemIds('playlists', {
				sort: 'createdAt',
				order: 'desc',
				searchTerm,
				searchFn: (p, term) => p.name.includes(term),
			}),
	})

	const initialTrackPlaylists = createQuery({
		// We only care about initial values
		key: [],
		fetcher: async () => {
			const firstTrackId = trackIds.at(0)
			// In case there are multiple track ids, we treat as if there are no items added in the playlist
			if (trackIds.length > 1 || !firstTrackId) {
				return null
			}

			const db = await getDatabase()
			const items = await db.getAllFromIndex('playlistEntries', 'trackId', firstTrackId)

			return items
		},
	})

	type SelectionStatus = 'added-already' | 'add' | 'remove'
	const selection = new SvelteMap</* playlist id */ number, SelectionStatus>()

	$effect(() => {
		if (initialTrackPlaylists.status === 'loaded') {
			untrack(() => {
				for (const playlistEntry of initialTrackPlaylists.value ?? []) {
					selection.set(playlistEntry.playlistId, 'added-already')
				}
			})
		}
	})

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
	{#if playlistsIdsQuery.status === 'error' || initialTrackPlaylists.status === 'error'}
		<div class="py-10 text-center">{m.errorUnexpected()}</div>
	{:else if playlistsIdsQuery.status === 'loaded'}
		<PlaylistListContainer
			items={playlistsIdsQuery.value}
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
	{/if}
</ScrollContainer>

{@render children({ save })}
