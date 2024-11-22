<script lang="ts">
	import { page } from '$app/stores'
	import Button from '$lib/components/Button.svelte'

	const is404 = $derived($page.status === 404)
</script>

<div class="max-w-260px m-auto flex w-full flex-col items-center p-4 text-center">
	<h1 class="text-headline-md">
		{#if is404}
			404
		{:else}
			{$page.error?.message}
		{/if}
	</h1>

	{#if is404}
		<div class="mt-2 text-body-lg">{m.errorPageDoesNotExist()}</div>
	{/if}

	<Button as="a" href="/" class="mt-4 w-full">Go home</Button>
</div>
