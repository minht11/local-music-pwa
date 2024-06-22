<script lang="ts">
	import TextField from '$lib/components/TextField.svelte'

	let name = $state('')
</script>

<div>
	<TextField bind:value={name} placeholder="New playlist name" />
</div>
