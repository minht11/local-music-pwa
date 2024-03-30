<script lang="ts">
	import type { Snippet } from 'svelte'

	const { children } = $props<{
		newDir: FileSystemDirectoryHandle
		existingDir: FileSystemDirectoryHandle
		children: Snippet<{
			newDir: FileSystemDirectoryHandle
			existingDir: FileSystemDirectoryHandle
		}>
	}>()
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
	{
		
	}
</Dialog>
