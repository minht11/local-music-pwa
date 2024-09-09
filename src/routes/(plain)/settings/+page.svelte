<script lang="ts">
	import { dev } from '$app/environment'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Select from '$lib/components/Select.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import WrapTranslation from '$lib/components/WrapTranslation.svelte'
	import CommonDialog from '$lib/components/dialog/CommonDialog.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import type { Directory } from '$lib/db/database-types.ts'
	import { initPageQueries } from '$lib/db/query.svelte.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import { useMainStore } from '$lib/stores/main-store.svelte.ts'
	import {
		checkNewDirectoryStatus,
		directoriesStore,
		importDirectory,
		importReplaceDirectory,
		removeDirectory,
	} from './directories.svelte.ts'

	const { data } = $props()

	initPageQueries(data)

	const mainStore = useMainStore()

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
			// startIn: 'music',
			mode: 'read',
		})

		// // TODO. Testing stuff
		// if (window) {
		// 	return await importDirectory(directory)
		// }

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

	const themeOptions = [
		{
			name: m.settingsThemeAuto(),
			value: 'auto',
		},
		{
			name: m.settingsThemeDark(),
			value: 'dark',
		},
		{
			name: m.settingsThemeLight(),
			value: 'light',
		},
	] as const

	const motionOptions = [
		{
			name: m.settingsMotionAuto(),
			value: 'auto',
		},
		{
			name: m.settingsMotionReduced(),
			value: 'reduced',
		},
		{
			name: m.settingsMotionNormal(),
			value: 'normal',
		},
	] as const

	const themeColor = {
		get value() {
			return mainStore.themeColorSeedHex
		},
		set value(value: string | null) {
			updateMainColor(value)
		},
	}

	const updateMainColor = debounce((value: string | null) => {
		mainStore.themeColorSeedHex = value
	}, 400)
</script>

<section class="card mx-auto w-full max-w-[900px]">
	<div class="flex gap-24px px-16px pt-16px">
		<div>
			<div class="text-body-lg">
				<WrapTranslation messageFn={m.settingsCurrentTracksInLibrary}>
					{#snippet tracksCount()}
						<strong class="rounded-12px tabular-nums bg-tertiary px-8px text-onTertiary">
							{count}
						</strong>
					{/snippet}
				</WrapTranslation>
			</div>
			<div>{m.settingsAllDataLocal()}</div>
		</div>
	</div>

	<Separator class="mt-16px" />

	<div class="flex flex-col gap-16px p-16px">
		{#if !isFileSystemAccessSupported}
			<div
				class="flex select-text flex-col gap-16px rounded-8px border border-outlineVariant p-16px text-onSurfaceVariant"
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
					{:else}
						<div class="mx-auto col-span-full">No directories added</div>
					{/each}
					<!-- <li
						class="flex h-56px gap-8px items-center text-onTertiaryContainer bg-tertiaryContainer/24 pl-16px pr-4px rounded-4px"
					>
						<div class="truncate">Tracks without directory</div>
						<Icon type="information" class="text-onTertiaryContainer/54 size-16px" />
					</li> -->
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

{#if dev}
	<section class="card mx-auto w-full max-w-[900px] mt-24px text-body-lg p-16px">
		<div>Development panel</div>

		<div class="flex gap-8px mt-16px">
			<Button kind="toned">Import directory handle</Button>
			<Button kind="toned">Import file handle</Button>
			<Button kind="toned">Import file</Button>
		</div>
	</section>
{/if}

<section class="card mx-auto w-full max-w-[900px] mt-24px text-body-lg">
	<div class="text-title-sm px-16px pt-16px">{m.settingsAppearance()}</div>

	<div class="flex justify-between items-center p-16px">
		<div>{m.settingsApplicationTheme()}</div>

		<Select
			bind:selected={mainStore.theme}
			items={themeOptions}
			key="value"
			labelKey="name"
			class="w-200px"
		/>
	</div>

	<div class="flex justify-between items-center p-16px">
		<div>{m.settingPickColorFromArtwork()}</div>

		<Switch bind:checked={mainStore.pickColorFromArtwork} />
	</div>

	<div class="flex flex-col sm:flex-row items-center p-16px gap-x-8px gap-y-16px">
		<div class="mr-auto">{m.settingsPrimaryColor()}</div>

		<div class="flex gap-8px max-sm:w-full">
			<Button
				kind="outlined"
				class="max-sm:w-full"
				disabled={!mainStore.themeColorSeedHex}
				onclick={() => {
					mainStore.themeColorSeedHex = null
				}}
			>
				{m.settingsColorReset()}
			</Button>

			<Button kind="toned" class="max-sm:w-full">
				<div class="rounded-full p-4px" style={`background: ${mainStore.themeColorSeedHex}`}>
					<Icon type="eyedropper" class="size-20px" />
				</div>

				{m.settingsColorPick()}

				<input
					type="color"
					bind:value={themeColor.value}
					class="appearance-none w-full h-full absolute inset-0 opacity-0 cursor-pointer"
				/>
			</Button>
		</div>
	</div>

	<Separator />

	<div class="flex justify-between items-center p-16px">
		<div>{m.settingsMotion()}</div>

		<Select
			bind:selected={mainStore.motion}
			items={motionOptions}
			key="value"
			labelKey="name"
			class="w-200px"
		/>
	</div>

	<Separator />

	<div class="flex justify-between items-center p-16px">
		<div>
			{m.settingsDisplayVolumeSlider()}
		</div>

		<Switch bind:checked={mainStore.volumeSliderEnabled} />
	</div>
</section>

<section class="card mx-auto w-full max-w-[900px] mt-24px text-body-lg">
	<div class="flex justify-between items-center p-16px">
		<div>{m.about()}</div>

		<IconButton as="a" href="/about" tooltip={m.about()} icon="chevronRight" />
	</div>
</section>

{#snippet directoryName(name: string | undefined)}
	<span class="text-tertiary w-fit h-16.5px inline-flex items-center gap-4px">
		<Icon type="folder" class="size-12px" />

		<span class="truncate inline max-w-[100px] w-fit h-full">{name}</span>
	</span>
{/snippet}

<CommonDialog
	open={{
		get: () => reparentDirectory,
		close: () => {
			reparentDirectory = null
		},
	}}
	class="[--dialog-width:340px]"
	icon="folderHidden"
	title={m.replaceDirectoryQ()}
	buttons={(data) => [
		{
			title: m.cancel(),
		},
		{
			title: m.replace(),
			action: () => {
				importReplaceDirectory(data.existingDir.id, data.newDirHandle)
			},
		},
	]}
>
	{#snippet children({ data })}
		<WrapTranslation messageFn={m.replaceDirectoryExplanation}>
			{#snippet existingDir()}
				{@render directoryName(data.existingDir.handle.name)}
			{/snippet}
			{#snippet newDir()}
				{@render directoryName(data.newDirHandle.name)}
			{/snippet}
		</WrapTranslation>
	{/snippet}
</CommonDialog>
