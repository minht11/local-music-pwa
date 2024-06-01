<script lang="ts">
	import ScrollContainer from './ScrollContainer.svelte'

	type LayoutMode = 'both' | 'list' | 'details'

	interface Props {
		mode: LayoutMode
		list: Snippet<[LayoutMode]>
		details: Snippet<[LayoutMode]>
		class?: string
		gap?: number
	}

	const { mode, list, details, class: className, gap = 0 }: Props = $props()
</script>

<div class={clx('!flex !flex-col', className)}>
	<div class="flex h-full grow" style={`column-gap: ${gap}px;`}>
		{#if mode === 'both'}
			<ScrollContainer
				class="overflow-y-auto max-h-100vh shrink-0 sticky top-0 overscroll-contain flex flex-col pb-[var(--bottom-overlay-height)]"
			>
				{@render list(mode)}
			</ScrollContainer>
		{/if}

		<div class="w-full grow flex flex-col pb-[var(--bottom-overlay-height)]">
			{#if mode === 'both' || mode === 'details'}
				{@render details(mode)}
			{:else if mode === 'list'}
				{@render list(mode)}
			{/if}
		</div>
	</div>
</div>
