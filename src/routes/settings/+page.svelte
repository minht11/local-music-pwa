<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Dialog from '$lib/components/Dialog.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import WrapTranslation from '$lib/components/WrapTranslation.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { initPageQueries } from '$lib/db/db-fast.svelte.ts'
	import type { Directory } from '$lib/db/entities.ts'
	import {
		checkNewDirectoryStatus,
		directoriesStore,
		importDirectory,
		importReplaceDirectory,
		removeDirectory,
	} from './directories.svelte.ts'

	const { data } = $props()

	initPageQueries(data)

	const count = $derived(data.countQuery.value)
	const directories = $derived(data.directoriesQuery.value)

	const isFileSystemAccessSupported = true

	interface ReparentDirectory {
		existingDir: Directory
		newDirHandle: FileSystemDirectoryHandle
	}

	let reparentDirectory = $state<ReparentDirectory | null>(null)

	const onImportTracksHandler = async () => {
		const directory = await showDirectoryPicker({
			startIn: 'music',
			mode: 'read',
		})

		// TODO. Testing stuff
		if (window) {
			return await importDirectory(directory)
		}

		let data: Awaited<ReturnType<typeof checkNewDirectoryStatus>> | undefined
		for (const existingDir of directories) {
			const result = await checkNewDirectoryStatus(existingDir, directory)

			if (result) {
				data = result
				break
			}
		}

		if (!data) {
			await importDirectory(directory)

			return
		}

		const { status, existingDir, newDirHandle } = data

		const existingDirName = existingDir.handle.name
		const newDirName = newDirHandle.name

		if (status === 'existing') {
			snackbar({
				id: 'directory-already-included',
				message: `Directory '${directory.name}' is already included`,
			})

			return
		}

		if (status === 'child') {
			snackbar({
				id: 'directory-added',
				message: m.directoryIsIncludedInParent({
					existingDir: existingDirName,
					newDir: newDirName,
				}),
			})

			return
		}

		reparentDirectory = {
			existingDir,
			newDirHandle,
		}
	}

	let compactLayout = $state(false)
</script>

<section class="card mx-auto w-full max-w-[900px] mt-64px">
	<div class="flex gap-24px px-16px pt-16px">
		<div>
			<div class="text-body-lg">
				Currently there are
				<strong class="rounded-12px tabular-nums bg-tertiary px-8px text-onTertiary">
					{count}
				</strong>
				tracks inside your library
			</div>
			<div>All data is stored on your device</div>
		</div>
	</div>

	<Separator class="mt-16px" />

	<div class="flex flex-col gap-16px p-16px">
		{#if !isFileSystemAccessSupported}
			<div
				class="flex select-text flex-col gap-16px rounded-8px border border-solid border-outlineVariant p-16px text-onSurfaceVariant"
			>
				<Icon type="alertCircle" class="shrink-0" />
				<span>
					Your browser currently does not support&nbsp
					<a
						class="link inline-block"
						target="_blank"
						rel="noopener noreferrer"
						href="https://wicg.github.io/file-system-access/"
					>
						required FS features
					</a>, so in order for this app to work,
					<strong>each track (music file) copy must be saved inside browser storage</strong>, that
					might consume a lot of your device's storage.
				</span>
			</div>
		{:else}
			<div class="flex flex-col">
				<div class="text-title-sm mb-16px">Directories</div>

				<ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-8px">
					{#each directories as dir}
						<li
							class="flex h-56px gap-8px items-center text-onTertiaryContainer bg-tertiaryContainer/56 pl-16px pr-4px rounded-4px"
						>
							<div class="truncate">
								{dir.handle.name}
							</div>

							<div class="ml-auto flex gap-4px items-center">
								{#if directoriesStore.isInprogress(dir.id)}
									<Spinner class="w-20px h-20px ml-8px mr-10px" />
								{:else}
									<IconButton icon="cached" title="Rescan" />
									<IconButton
										icon="trashOutline"
										title="Remove"
										onclick={() => {
											removeDirectory(dir.id)
										}}
									/>
								{/if}
							</div>
						</li>
					{/each}
					<li
						class="flex h-56px gap-8px items-center text-onTertiaryContainer bg-tertiaryContainer/24 pl-16px pr-4px rounded-4px"
					>
						<div class="truncate">Tracks without directory</div>
						<Icon type="information" class="text-onTertiaryContainer/54 !size-16px" />
					</li>
				</ul>

				<div class="flex flex-col sm:flex-row gap-8px mt-16px">
					{#if directories.length > 0}
						<Button kind="outlined">
							<Icon type="trashOutline" />

							Remove all
						</Button>

						<Button kind="outlined">
							<Icon type="cached" />

							Rescan all
						</Button>
					{/if}

					<Button kind="toned" class="sm:ml-auto" onclick={onImportTracksHandler}>
						{#if isFileSystemAccessSupported}
							Add directory
						{:else}
							Import tracks
						{/if}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</section>

<section class="card mx-auto w-full max-w-[900px] mt-24px text-body-lg">
	<div class="text-title-sm px-16px pt-16px">Appearance</div>

	<div class="flex justify-between items-center p-16px">
		<div>Application theme</div>
	</div>

	<div class="flex justify-between items-center p-16px">
		<div>Automatically pick color from currently playing song</div>

		<Switch bind:checked={compactLayout} />
	</div>

	<div class="flex justify-between items-center p-16px">
		<div>Application primary color</div>

		<div class="bg-primary rounded-full h-40px w-40px"></div>
	</div>

	<Separator />

	<div class="flex justify-between items-center p-16px">
		<div class="flex flex-col justify-center">
			<div>Compact layout</div>
			<div class="text-body-sm text-onSurface/54">
				Some elements such as lists will be more compact.
			</div>
		</div>

		<Switch bind:checked={compactLayout} />
	</div>

	<div class="flex justify-between items-center p-16px">
		<div>Display volume slider inside full player screen</div>

		<Switch bind:checked={compactLayout} />
	</div>
</section>

{#snippet directoryName(name: string | undefined)}
	<span class="text-tertiary w-fit h-16.5px inline-flex items-center gap-4px">
		<Icon type="folder" class="!size-12px" />

		<span class="truncate inline max-w-[100px] w-fit h-full">{name}</span>
	</span>
{/snippet}

<!-- TODO. When closing dialog text changes -->
<Dialog
	open={!!reparentDirectory}
	class="[--dialog-width:340px]"
	icon="folderHidden"
	title={m.replaceDirectoryQ()}
	buttons={[
		{
			title: m.cancel()
		},
		{
			title: m.replace(),
			action: () => {
				importReplaceDirectory(reparentDirectory?.existingDir.id!, reparentDirectory?.newDirHandle!)
			},
		},
	]}
	onclose={() => {
		reparentDirectory = null
	}}
>
	<WrapTranslation messageFn={m.replaceDirectoryExplanation}>
		{#snippet existingDir()}
			{@render directoryName(reparentDirectory?.existingDir.handle.name)}
		{/snippet}
		{#snippet newDir()}
			{@render directoryName(reparentDirectory?.newDirHandle.name)}
		{/snippet}
	</WrapTranslation>
</Dialog>
