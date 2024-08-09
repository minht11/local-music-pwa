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

{#if snackbarItems.length !== 0}
	<div class="flex flex-col gap-8px px-8px pb-16px bg-transparent w-full max-w-500px mx-auto">
		{#each snackbarItems as item (item.id)}
			<div class="top-auto" animate:flip={{ duration: 140 }}>
				<Snackbar {...item} ondismiss={dismissHandler} />
			</div>
		{/each}
	</div>
{/if}
