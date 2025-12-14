<script lang="ts">
	import { goto } from '$app/navigation'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import { initPageQueries } from '$lib/db/query/page-query.svelte'
	import { migrateV1LegacyData } from '$lib/library/scan-actions/v1-legacy-migrate'

	const { data } = $props()

	// svelte-ignore state_referenced_locally
	initPageQueries(data)

	const areDirectoriesSupported = !!globalThis.showDirectoryPicker

	const features = [
		areDirectoriesSupported && 'Directories management.',
		'New design and improved support for large displays.',
		'Much better performance for large libraries.',
		'And more...',
	].filter(Boolean)

	$effect(() => {
		if (data.tracksCount.value > 0) {
			void goto('/library/tracks')
		}
	})
</script>

<div class="card m-auto max-w-120 p-4">
	<div class="mb-4 text-title-lg">Snae Player got an upgrade!</div>

	<div class="text-body-md">
		<ul>
			{#each features as feature}
				<li class="flex items-center gap-2">
					<Icon type="check" class="size-4 text-primary" />
					{feature}
				</li>
			{/each}
		</ul>
	</div>

	<Separator class="my-4" />

	<div class="mb-2 text-title-md">Do you want to migrate your data?</div>

	<div>
		You used previous version of this app.
		{#if areDirectoriesSupported}
			Directories management is not supported for previously imported tracks.
		{/if}

		<Button
			class="mt-4 mb-2 w-full"
			kind={areDirectoriesSupported ? 'filled' : 'outlined'}
			onclick={() => {
				void goto('/settings')
			}}
		>
			Start fresh
			{#if areDirectoriesSupported}
				(Recommended)
			{/if}
		</Button>

		<Button class="w-full" kind="outlined" onclick={migrateV1LegacyData}>
			Migrate data{#if areDirectoriesSupported}
				. Limited functionality
			{/if}
		</Button>
	</div>
</div>
