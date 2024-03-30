<script lang="ts">
	import { clx } from '$lib/helpers/clx'

	interface Props {
		name: string
		count: number
		as?: 'li' | 'div'
		class?: string
		children?: Snippet
	}

	const { name, count, as = 'li', children, ...restProps }: Props = $props()
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
	<div class="flex gap-4px items-center">
		{#if children}
			{@render children()}
		{/if}
	</div>
</svelte:element>

<style>
	.directory-item {
		grid-template-columns: 1fr 72px auto;
	}
</style>
