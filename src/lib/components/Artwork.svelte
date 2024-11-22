<script lang="ts">
	import Icon from './icon/Icon.svelte'
	import type { IconType } from './icon/Icon.svelte'

	interface Props {
		src: string
		class?: string
		alt?: string
		fallbackIcon?: IconType | null
		children?: Snippet
	}

	const { src, fallbackIcon = 'musicNote', class: className, alt, children }: Props = $props()

	let error = $state(false)
</script>

<div
	class={clx(
		'flex aspect-1/1 overflow-hidden bg-surfaceContainerHighest ring-1 ring-surface/40 contain-strict',
		className,
	)}
>
	{#if src && !error}
		<img
			{src}
			{alt}
			loading="eager"
			class="h-full w-full object-cover"
			draggable="false"
			onerror={() => {
				error = true
			}}
			onload={() => {
				error = false
			}}
		/>
	{:else if fallbackIcon !== null}
		<Icon type={fallbackIcon} class="m-auto size-1/6" />
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
