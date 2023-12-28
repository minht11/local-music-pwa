<script lang="ts">
	const { src, class: className } = $props<{ src: string; class?: string }>()
</script>

<img
	{src}
	alt="Artwork"
	class={clx('ring ring-inset ring-primary/20 rounded-8px aspect-1/1 object-cover', className)}
/>
