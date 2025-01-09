<script lang="ts">
	const { active }: { active: boolean } = $props()
</script>

<div
	class={[
		'absolute bottom-1 size-1 origin-center rounded-full bg-primary transition-transform duration-600',
		active ? 'scale-100' : 'scale-0',
	]}
></div>
