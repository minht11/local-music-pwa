<script lang="ts">
	import Icon from './icon/Icon.svelte'
	import type { IconType } from './icon/icon-types.ts'

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
	class={clx('ring-1 ring-primary/20 aspect-1/1 flex overflow-hidden contain-strict', className)}
>
	{#if src && !error}
		<img
			{src}
			{alt}
			loading="eager"
			class="object-cover w-full h-full"
			draggable="false"
			onerror={() => {
				error = true
			}}
			onload={() => {
				error = false
			}}
		/>
	{:else if fallbackIcon !== null}
		<Icon type={fallbackIcon} class="m-auto size-60%" />
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
