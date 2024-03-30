<script lang="ts">
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: string } = $props()
</script>

<IconButton class={className} icon="repeat" />
