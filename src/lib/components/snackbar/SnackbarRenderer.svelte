<script lang="ts">
	import { flip } from 'svelte/animate'
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
	<div animate:flip={{ duration: 140 }}>
		<Snackbar {...item} ondismiss={dismissHandler} />
	</div>
{/each}
