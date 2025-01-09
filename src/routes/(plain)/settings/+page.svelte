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
			mode: 'read',
		})

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

	const updateMainColor = debounce((value: string | null) => {
		mainStore.themeColorSeedHex = value
	}, 400)
</script>

<section class="card container-lg mx-auto w-full max-w-[var(--settings-max-width)]">
	<div class="flex gap-6 px-4 pt-4">
		<div>
			<div class="text-body-lg">
				<WrapTranslation messageFn={m.settingsCurrentTracksInLibrary}>
					{#snippet tracksCount()}
						<strong class="rounded-xl bg-tertiary px-2 text-onTertiary tabular-nums">
							{count}
						</strong>
					{/snippet}
				</WrapTranslation>
			</div>
			<div>{m.settingsAllDataLocal()}</div>
		</div>
	</div>

	<Separator class="mt-4" />

	<div class="flex flex-col gap-4 p-4">
		{#if !isFileSystemAccessSupported}
			<div
				class="flex flex-col gap-4 rounded-lg border border-outlineVariant p-4 text-onSurfaceVariant select-text"
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
				<div class="mb-4 text-title-sm">Directories</div>

				<ul class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
					{#each directories as dir}
						<li
							class="flex h-14 items-center gap-2 rounded-sm bg-tertiaryContainer/56 pr-1 pl-4 text-onTertiaryContainer"
						>
							<div class="truncate">
								{dir.handle.name}
							</div>

							<div class="ml-auto flex items-center gap-1">
								{#if directoriesStore.isInprogress(dir.id)}
									<Spinner class="mr-2.5 ml-2 h-5 w-5" />
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
						class="flex h-14 gap-2 items-center text-onTertiaryContainer bg-tertiaryContainer/24 pl-4 pr-1 rounded-sm"
					>
						<div class="truncate">Tracks without directory</div>
						<Icon type="information" class="text-onTertiaryContainer/54 size-4" />
					</li> -->
				</ul>

				<div class="mt-4 flex flex-col gap-2 sm:flex-row">
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
	<section class="card mx-auto mt-6 w-full max-w-[var(--settings-max-width)] p-4 text-body-lg">
		<div>Development panel</div>

		<div class="mt-4 flex gap-2">
			<Button kind="toned">Import directory handle</Button>
			<Button kind="toned">Import file handle</Button>
			<Button kind="toned">Import file</Button>
		</div>
	</section>
{/if}

<section class="card mx-auto mt-6 w-full max-w-[var(--settings-max-width)] text-body-lg">
	<div class="px-4 pt-4 text-title-sm">{m.settingsAppearance()}</div>

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsApplicationTheme()}</div>

		<Select
			bind:selected={mainStore.theme}
			items={themeOptions}
			key="value"
			labelKey="name"
			class="w-25"
		/>
	</div>

	<div class="flex items-center justify-between p-4">
		<div>{m.settingPickColorFromArtwork()}</div>

		<Switch bind:checked={mainStore.pickColorFromArtwork} />
	</div>

	<div class="flex flex-col items-center gap-x-2 gap-y-4 p-4 sm:flex-row">
		<div class="mr-auto">{m.settingsPrimaryColor()}</div>

		<div class="flex gap-2 max-sm:w-full">
			{#if mainStore.themeColorSeedHex}
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
			{/if}

			<div class="relative flex">
				<Button kind="toned" class="max-sm:w-full">
					<Icon type="eyedropper" class="size-5" />

					{m.settingsColorPick()}

					<input
						type="color"
						bind:value={() => mainStore.themeColorSeedHex, (value) => updateMainColor(value)}
						class="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
					/>
				</Button>
				{#if mainStore.themeColorSeedHex}
					<div
						class="pointer-events-none absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-inverseSurface"
						style={`background: ${mainStore.themeColorSeedHex}`}
					></div>
				{/if}
			</div>
		</div>
	</div>

	<Separator />

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsMotion()}</div>

		<Select
			bind:selected={mainStore.motion}
			items={motionOptions}
			key="value"
			labelKey="name"
			class="w-25"
		/>
	</div>

	<Separator />

	<div class="flex items-center justify-between p-4">
		<div>
			{m.settingsDisplayVolumeSlider()}
		</div>

		<Switch bind:checked={mainStore.volumeSliderEnabled} />
	</div>
</section>

<section class="card mx-auto mt-6 w-full max-w-[var(--settings-max-width)] text-body-lg">
	<div class="flex items-center justify-between p-4">
		<div>{m.about()}</div>

		<IconButton as="a" href="/about" tooltip={m.about()} icon="chevronRight" />
	</div>
</section>

{#snippet directoryName(name: string | undefined)}
	<span class="inline-flex h-[calc(var(--spacing)*4.125)] w-fit items-center gap-1 text-tertiary">
		<Icon type="folder" class="size-3" />

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
	class="[--dialog-width:calc(var(--spacing)*85)]"
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

<style>
	@reference '../../../app.css';

	:root {
		--settings-max-width: --spacing(225);
	}
</style>
