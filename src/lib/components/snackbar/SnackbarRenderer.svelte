<script lang="ts">
	import Snackbar from './Snackbar.svelte'
	import { snackbarItems } from './store.svelte'

	const dismissHandler = (id: string) => {
		const index = snackbarItems.findIndex((item) => item.id === id)

		if (index !== -1) {
			snackbarItems.splice(index, 1)
		}
	}
</script>

{#each snackbarItems as item (item.id)}
	<Snackbar {...item} ondismiss={dismissHandler} />
{/each}
