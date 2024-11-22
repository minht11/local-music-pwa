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
		'flex flex-col gap-4 rounded-lg border border-outlineVariant p-4 text-outline select-text sm:flex-row sm:items-center',
		restProps.class,
	)}
>
	<Icon type={icon} class="shrink-0 text-outline" />

	<span>
		{#if children}
			{@render children()}
		{/if}
	</span>
</div>
