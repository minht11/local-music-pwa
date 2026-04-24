<script lang="ts">
	import type { IconType } from './icon/Icon.svelte'
	import Icon from './icon/Icon.svelte'

	interface Props {
		src: string | undefined
		class?: ClassValue
		alt?: string
		fallbackIcon?: IconType | false
		noFallbackBg?: boolean
		children?: Snippet
	}

	const {
		src,
		fallbackIcon = 'musicNote',
		noFallbackBg,
		class: className,
		alt,
		children,
	}: Props = $props()

	let error = $state(false)

	$effect(() => {
		void src

		untrack(() => {
			error = false
		})
	})
</script>

<div
	class={[
		'flex aspect-square overflow-hidden ring-1 ring-surfaceContainerHigh contain-strict',
		!noFallbackBg && 'bg-surfaceContainerHighest',
		className,
	]}
>
	{#if src && !error}
		<!-- biome-ignore lint/a11y/useAltText: false positive, alt exists -->
		<img
			{src}
			{alt}
			loading="eager"
			class="size-full object-cover"
			draggable="false"
			onerror={() => {
				error = true
			}}
			onload={() => {
				error = false
			}}
		/>
	{:else if fallbackIcon !== false}
		<Icon type={fallbackIcon} class="m-auto size-2/3" />
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
