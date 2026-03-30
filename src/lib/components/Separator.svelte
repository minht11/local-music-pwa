<script lang="ts">
	interface Props {
		vertical?: boolean
		class?: ClassValue
	}

	const { vertical, class: className }: Props = $props()
</script>

<!-- biome-ignore-start lint/a11y/useAriaPropsForRole: false positive -->
<div
	role="separator"
	aria-orientation={vertical ? 'vertical' : 'horizontal'}
	class={[
		className,
		'shrink-0 self-stretch border-outlineVariant',
		vertical ? 'w-0 border-r' : 'h-0 border-b',
	]}
></div>
<!-- biome-ignore-end lint/a11y/useAriaPropsForRole: false positive -->
