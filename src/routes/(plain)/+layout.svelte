<script lang="ts">
	import { page } from '$app/state'
	import Header from '$lib/components/Header.svelte'

	const { children } = $props()
</script>

<Header title={page.data.title} mode="fixed" />

<div class="flex grow flex-col px-4">
	{@render children()}
</div>

<div class="mt-4 h-[var(--bottom-overlay-height)] shrink-0"></div>
