<script lang="ts">
	import { flip } from 'svelte/animate'
	import Snackbar from './Snackbar.svelte'
	import { snackbarItems } from './store.svelte'

	interface Props {
		bottomOffset: number
	}

	const { bottomOffset }: Props = $props()

	const dismissHandler = (id: string) => {
		const index = snackbarItems.findIndex((item) => item.id === id)

		if (index !== -1) {
			snackbarItems.splice(index, 1)
		}
	}

	let container = $state<HTMLDivElement | null>(null)

	window.addEventListener('dialog-opened', () => {
		if (snackbarItems.length === 0) {
			return
		}

		// Elements in top-layer are displayed based on show order
		// To make sure snackbar are always on top, we hide and show them again
		// to make sure they are on top
		container?.hidePopover()
		container?.showPopover()
	})

	$effect(() => {
		container?.showPopover()
	})
</script>

{#if snackbarItems.length !== 0}
	<div
		bind:this={container}
		popover="manual"
		class="flex flex-col gap-8px px-8px pb-16px bg-transparent inset-0 top-auto w-full max-w-500px mx-auto"
		style={`bottom:${bottomOffset}px;`}
	>
		{#each snackbarItems as item (item.id)}
			<div class="top-auto" animate:flip={{ duration: 140 }}>
				<Snackbar {...item} ondismiss={dismissHandler} />
			</div>
		{/each}
	</div>
{/if}
