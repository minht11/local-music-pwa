<script lang="ts">
	import { ripple } from '$lib/actions/ripple.ts'
	import { tooltip } from '$lib/actions/tooltip'
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import WrapTranslation from '$lib/components/WrapTranslation.svelte'
	import {
		checkNewDirectoryStatus,
		importNewDirectory,
		removeDirectory,
		replaceDirectories,
		rescanDirectory,
	} from '$lib/library/scan-actions/directories.ts'
	import type { Directory } from '$lib/library/types.ts'
	import type { DirectoryWithCount } from '../+page.ts'

	interface Props {
		disabled: boolean
		directories: DirectoryWithCount[]
	}

	const { disabled, directories }: Props = $props()

	interface ReparentDirectory {
		childDirs: Directory[]
		newDirHandle: FileSystemDirectoryHandle
	}

	let reparentDirectory = $state<ReparentDirectory | null>(null)

	const addNewDirectoryHandler = async () => {
		const directory = await showDirectoryPicker({
			mode: 'read',
		})

		let childDirectories: Directory[] = []
		for (const existingDir of directories) {
			if (existingDir.legacy) {
				continue
			}

			const result = await checkNewDirectoryStatus(existingDir, directory)
			if (result?.status === 'existing') {
				snackbar({
					id: 'directory-already-included',
					message: `Directory '${directory.name}' is already included`,
				})

				return
			}

			if (result?.status === 'child') {
				snackbar({
					id: 'directory-added',
					message: m.directoryIsIncludedInParent({
						existingDir: existingDir.handle.name,
						newDir: directory.name,
					}),
				})

				return
			}

			if (result) {
				childDirectories.push(result.existingDir)
			}
		}

		if (childDirectories.length > 0) {
			reparentDirectory = {
				childDirs: childDirectories,
				newDirHandle: directory,
			}
		} else {
			void importNewDirectory(directory)
		}
	}
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
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
					{dir.count} tracks
				</div>
			</div>

			<div class="ml-auto flex items-center gap-1">
				{#if !dir.legacy}
					<IconButton
						{disabled}
						icon="cached"
						tooltip="Rescan"
						onclick={() => {
							void rescanDirectory(dir.id, dir.handle)
						}}
					/>
				{/if}
				<IconButton
					{disabled}
					icon="trashOutline"
					tooltip="Remove"
					onclick={() => {
						void removeDirectory(dir.id)
					}}
				/>
			</div>
		</li>
	{/each}
	<li class="contents">
		<button
			use:ripple
			class={[
				disabled ? 'bg-surfaceContainer/10 text-onSurface/54' : 'interactable',
				'flex h-16 items-center gap-2 rounded-sm px-4 ring-1 ring-outlineVariant ring-inset',
			]}
			{disabled}
			onclick={addNewDirectoryHandler}
		>
			<Icon type="plus" />
			{m.settingsAddDirectory()}
		</button>
	</li>
</ul>

{#snippet directoryName(name: string | undefined)}
	<span class="inline-flex h-[--spacing(4.125)] w-fit items-center gap-1 text-tertiary">
		<Icon type="folder" class="mt-[2px] size-3" />

		<span class="inline h-full w-fit max-w-25 truncate">{name}</span>
	</span>
{/snippet}

<CommonDialog
	open={{
		get: () => reparentDirectory,
		close: () => {
			reparentDirectory = null
		},
	}}
	class="[--dialog-width:--spacing(85)]"
	icon="folderHidden"
	title={m.replaceDirectoryQ()}
	buttons={(data) => [
		{
			title: m.cancel(),
		},
		{
			title: m.replace(),
			action: () => {
				const ids = data.childDirs.map((dir) => dir.id)
				void replaceDirectories(data.newDirHandle, ids)
			},
		},
	]}
>
	{#snippet children({ data })}
		<WrapTranslation messageFn={m.replaceDirectoryExplanation}>
			{#snippet existingDirs()}
				{#each data.childDirs as dir}
					{@render directoryName(dir.handle.name)}
				{/each}
			{/snippet}
			{#snippet newDir()}
				{@render directoryName(data.newDirHandle.name)}
			{/snippet}
		</WrapTranslation>
	{/snippet}
</CommonDialog>
