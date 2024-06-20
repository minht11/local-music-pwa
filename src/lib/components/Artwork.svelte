<script lang="ts">
	import Icon from './icon/Icon.svelte'

	interface Props {
		src: string
		class?: string
		alt?: string
		children?: Snippet
	}

	const { src, class: className, alt, children }: Props = $props()

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
	{:else}
		<Icon type="musicNote" class="m-auto size-60%" />
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
