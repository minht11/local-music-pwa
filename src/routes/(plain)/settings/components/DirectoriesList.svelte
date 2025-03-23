<script lang="ts">
	import { tooltip } from '$lib/actions/tooltip'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import type { DirectoryWithCount } from '../+page.ts'
	import { removeDirectory, rescanDirectory } from '../directories.svelte.ts'

	interface Props {
		disabled: boolean
		directories: DirectoryWithCount[]
	}

	const { disabled, directories }: Props = $props()
</script>

<ul class="mb-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
	{#each directories as dir}
		<li
			class={[
				'flex h-16 items-center gap-2 rounded-sm pr-1 pl-4 text-onTertiaryContainer',
				dir.legacy ? 'bg-tertiaryContainer/40' : 'bg-tertiaryContainer/56',
			]}
		>
			{#if dir.legacy}
				<div
					use:tooltip={'In previous version of the app, directories were not saved, this contains previously scanned tracks'}
				>
					<Icon type="information" class="size-4 text-onTertiaryContainer/54" />
				</div>
			{/if}

			<div class="flex flex-col overflow-hidden">
				<div class="truncate">
					{dir.legacy ? 'Tracks without directory' : dir.handle.name}
				</div>
				<div class="text-body-sm">
					{dir.count}
				</div>
			</div>

			<div class="ml-auto flex items-center gap-1">
				{#if !dir.legacy}
					<IconButton
						{disabled}
						icon="cached"
						tooltip="Rescan"
						onclick={() => {
							rescanDirectory(dir.id, dir.handle)
						}}
					/>
				{/if}
				<IconButton
					{disabled}
					icon="trashOutline"
					tooltip="Remove"
					onclick={() => {
						removeDirectory(dir.id)
					}}
				/>
			</div>
		</li>
	{/each}
</ul>
