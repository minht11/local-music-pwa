<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte'

	interface Props {
		newDir: FileSystemDirectoryHandle
		existingDir: FileSystemDirectoryHandle
		children: Snippet<{
			newDir: FileSystemDirectoryHandle
			existingDir: FileSystemDirectoryHandle
		}>
	}

	const { children }: Props = $props()
</script>

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
	{@render children({ newDir, existingDir })}
</Dialog>
