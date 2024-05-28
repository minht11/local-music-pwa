<script lang="ts">
	import { page } from '$app/stores'
	import Button from '$lib/components/Button.svelte'

	const is404 = $derived($page.status === 404)
</script>

<div class="flex flex-col max-w-260px items-center text-center m-auto w-full p-16px">
	<h1 class="text-headline-md">
		{#if is404}
			404
		{:else}
			{$page.error?.message}
		{/if}
	</h1>

	{#if is404}
		<div class="text-body-lg mt-8px">Looks like this page doesn't exist.</div>
	{/if}

	<Button as="a" href="/" class="w-full mt-16px">Go home</Button>
</div>
