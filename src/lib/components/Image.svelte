<script lang="ts">
	import Icon from './icon/Icon.svelte'

	const {
		src,
		class: className,
		alt,
	} = $props<{
		src: string
		class?: string
		alt?: string
	}>()

	let error = $state(false)
</script>

<div
	class={clx(
		'ring ring-inset ring-primary/20 aspect-1/1 flex overflow-hidden contain-strict',
		className,
	)}
>
	{#if src && !error}
		<img
			{src}
			{alt}
			loading="eager"
			class="object-cover w-full h-full"
			onerror={() => {
				error = true
			}}
			onload={() => {
				error = false
			}}
		/>
	{:else}
		<Icon type="musicNote" class="m-auto" />
	{/if}
</div>
