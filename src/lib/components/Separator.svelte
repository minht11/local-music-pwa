<script lang="ts">
	interface Props {
		vertical?: boolean
		class?: ClassValue
	}

	const { vertical, class: className }: Props = $props()
</script>

<div
	role="separator"
	aria-orientation={vertical ? 'vertical' : 'horizontal'}
	class={[
		className,
		'shrink-0 self-stretch border-outlineVariant',
		vertical ? 'w-0 border-r' : 'h-0 border-b',
	]}
></div>
