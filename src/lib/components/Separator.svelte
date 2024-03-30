<script lang="ts">
	interface Props {
		vertical?: boolean
		class?: string
	}

	const { vertical, class: className }: Props = $props()
</script>

<div
	role="separator"
	class={clx(
		className,
		'border-outlineVariant shrink-0 self-stretch',
		vertical ? 'w-0 border-r' : 'h-0 border-b',
	)}
/>
