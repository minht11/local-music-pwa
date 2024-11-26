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
	<div
		class="pointer-events-auto mx-auto flex w-full max-w-125 flex-col gap-2 bg-transparent px-2 pb-4"
	>
		{#each snackbarItems as item (item.id)}
			<div class="top-auto" animate:flip={{ duration: 140 }}>
				<Snackbar {...item} ondismiss={dismissHandler} />
			</div>
		{/each}
	</div>
{/if}
