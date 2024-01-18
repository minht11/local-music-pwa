<script lang="ts">
	const { vertical, class: className } = $props<{
		vertical?: boolean
		class?: string
	}>()
</script>

<div
	role="separator"
	class={clx(
		className,
		'border-outlineVariant shrink-0 self-stretch',
		vertical ? 'w-0 border-r' : 'h-0 border-b',
	)}
/>
