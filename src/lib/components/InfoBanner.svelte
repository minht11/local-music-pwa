<script lang="ts">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'

	const { icon = 'alertCircle', children, ...restProps } = $props<{
		icon?: IconType
		class?: string
		children?: () => unknown
	}>()
</script>

<div
	class={clx(
		'flex select-text flex-col gap-16px rounded-8px border border-solid border-outlineVariant p-16px text-outline sm:flex-row sm:items-center',
		restProps.class,
	)}
>
	<Icon type={icon} class="flex-shrink-0 text-outline" />

	<span>
		{#if children}
			{@render children()}
		{/if}
	</span>
</div>
