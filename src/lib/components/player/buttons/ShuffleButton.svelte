<script lang="ts">
	import IconButton from '../../IconButton.svelte'

	const { class: className } = $props<{ class?: string }>()
</script>

<IconButton class={className} icon="shuffle" />
