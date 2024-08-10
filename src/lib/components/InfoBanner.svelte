<script lang="ts">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'

	interface Props {
		icon?: IconType
		class?: string
		children?: Snippet
	}

	const { icon = 'alertCircle', children, ...restProps }: Props = $props()
</script>

<div
	class={clx(
		'flex select-text flex-col gap-16px rounded-8px border border-outlineVariant p-16px text-outline sm:flex-row sm:items-center',
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
