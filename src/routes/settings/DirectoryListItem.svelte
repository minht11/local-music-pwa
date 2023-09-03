<script lang="ts">
	import { clx } from '$lib/helpers/clx'

	export let name: string
	export let count: number
	export let as: 'li' | 'div' = 'li'
</script>

<svelte:element
	this={as}
	class={clx(
		'directory-item grid h-48px items-center gap-12px text-onSurfaceVariant',
		$$props.class,
	)}
>
	<div class="text-body-lg mr-auto truncate text-onSurface">{name}</div>
	<div class="truncate border-r border-solid border-outline text-center tabular-nums">{count}</div>
	<div class="flex gap-4px">
		<slot />
	</div>
</svelte:element>

<style>
	.directory-item {
		grid-template-columns: 1fr 72px auto;
	}
</style>
