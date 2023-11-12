<script lang="ts">
	import { clx } from '$lib/helpers/clx'

	const { name, count, as = 'li', ...restProps } = $props<{
		name: string
		count: number
		as?: 'li' | 'div',
		class?: string
	}>()
</script>

<svelte:element
	this={as}
	class={clx(
		'directory-item grid h-48px items-center gap-12px text-onSurfaceVariant',
		restProps.class,
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
