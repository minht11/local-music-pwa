<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Dialog from '$lib/components/Dialog.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import InfoBanner from '$lib/components/InfoBanner.svelte'
	import DirectoryListItem from './DirectoryListItem.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.js'
	import Spinner from '$lib/components/Spinner.svelte'

	const { data } = $props()

	const currentTracksCount = data.countQuery()

	const directories = $state<FileSystemDirectoryHandle[]>([])

	const folders = [
		{
			name: 'Music',
			count: 100,
			loading: true,
		},
		{
			name: 'Podcasts',
			count: 10,
		},
		{
			name: 'Audiobooks',
			count: 5,
		},
	]

	const isFileSystemAccessSupported = true

	interface DirectoryCollision {
		existing: string
		new: string
	}

	interface DialogOpenState {
		addDirectory: boolean
		alreadyIncludedChild?: DirectoryCollision
		replaceDirectory?: DirectoryCollision
	}

	let dialogsOpen = $state<DialogOpenState>({
		addDirectory: false,
		alreadyIncludedChild: undefined,
		replaceDirectory: undefined,
	})

	const checkNewDirectoryConditions = async (
		existingDir: FileSystemDirectoryHandle,
		newDir: FileSystemDirectoryHandle,
	) => {
		const paths = await existingDir.resolve(newDir)

		let status: 'child' | 'existing' | 'parent' | undefined
		if (paths) {
			status = paths.length === 0 ? 'existing' : 'child'
		} else {
			const parent = await newDir.resolve(existingDir)

			if (parent) {
				status = 'parent'
			}
		}

		if (status) {
			return {
				status,
				existingDir,
				newDir,
			}
		}

		return
	}

	const onImportTracksHandler = async () => {
		const directory = await showDirectoryPicker()

		let data: Awaited<ReturnType<typeof checkNewDirectoryConditions>> | undefined
		for (const existingDirectory of directories) {
			const result = await checkNewDirectoryConditions(existingDirectory, directory)

			if (result) {
				data = result
				break
			}
		}

		if (!data) {
			directories.push(directory)

			snackbar({
				id: 'directory-added',
				message: `Directory '${directory.name}' added`,
			})

			return
		}

		const { status, existingDir, newDir } = data

		if (status === 'child') {
			dialogsOpen.alreadyIncludedChild = {
				existing: existingDir.name,
				new: newDir.name,
			}
		} else if (status === 'existing') {
			snackbar({
				id: 'directory-already-included',
				message: `Directory '${directory.name}' is already included`,
			})
		} else if (status === 'parent') {
			dialogsOpen.replaceDirectory = {
				existing: existingDir.name,
				new: newDir.name,
			}
		} else {
			directories.push(directory)

			snackbar({
				id: 'directory-added',
				message: `Directory '${directory.name}' added`,
			})
		}
		// for await (const handle of directory.values()) {
		// 	console.log(entry, a)
		// 	// if (entry.kind === 'directory') {
		// 	// 	directories.update((dirs) => [...dirs, entry])
		// 	// }
		// }

		// const { importTracks } = await import('$lib/library/import-tracks/import-tracks')

		// await importTracks()
	}

	let compactLayout = $state(false)
</script>

<section class="card mx-auto w-full max-w-[900px] gap-24px">
	<div class="flex flex-col gap-24px px-16px pt-16px">
		<div>
			<div class="text-body-lg">
				Currently there are
				<strong class="rounded-12px tabular-nums bg-tertiary px-8px text-onTertiary">
					{currentTracksCount.value}
				</strong>
				tracks inside your library
			</div>
			<div>All data is stored on your device</div>
		</div>
		<div class="flex flex-col-reverse gap-8px xs:flex-row">
			<Button kind="outlined" class="xs:mr-auto">Clear data</Button>
			<Button kind="toned" onclick={onImportTracksHandler}>
				{#if isFileSystemAccessSupported}
					Add directory
				{:else}
					Import tracks
				{/if}
			</Button>
		</div>
	</div>

	<div class="flex flex-col gap-16px border-t border-solid border-outlineVariant p-16px">
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
			<DirectoryListItem as="div" name="Tracks without directory" count={100}>
				<IconButton icon="close" title="Remove" />
			</DirectoryListItem>

			<div class="flex flex-col">
				<div class="flex items-center justify-between">
					<div class="text-title-sm">Directories</div>
					<Button kind="flat">Rescan</Button>
				</div>

				<InfoBanner class="my-8px">
					Every time you open or reload the app, browser might ask you to allow access to your
					selected directories.
					<strong> To reduce number of popups please keep directory count to the minimum </strong>
				</InfoBanner>

				<ul>
					{#each folders as folder}
						<DirectoryListItem name={folder.name} count={folder.count}>
							{#if folder.loading}
								<Spinner class="w-20px h-20px ml-8px mr-10px" />
							{:else}
								<IconButton icon="cached" title="Rescan" />
								<IconButton icon="close" title="Remove" />
							{/if}
						</DirectoryListItem>
					{/each}
				</ul>
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

{#if dialogsOpen.replaceDirectory}
	{@const newName = dialogsOpen.replaceDirectory.new}
	{@const existingName = dialogsOpen.replaceDirectory.existing}
	<Dialog
		open={!!dialogsOpen.replaceDirectory}
		class="!max-w-[340px]"
		icon="folderHidden"
		title="{`"${newName}"`} is already included"
		buttons={[{ title: 'Understood' }]}
		onclose={() => {
			dialogsOpen.replaceDirectory = undefined
		}}
	>
		Directory "{newName}" is already included because it is inside "{existingName}" directory. You
		don't need to add it again.
	</Dialog>
{/if}

<Dialog
	bind:open={dialogsOpen.addDirectory}
	title="Replace directory 'Music' with 'Wow'?"
	buttons={[{ title: 'Cancel' }, { title: 'Ok' }]}
	class="max-w-340px!"
>
	Existing directory inside your Library 'Wow' is a subdirectory of 'Music' directory. Do you want
	it to be replaced?
</Dialog>
