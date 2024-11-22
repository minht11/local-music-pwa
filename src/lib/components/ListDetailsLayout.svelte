<script lang="ts">
	import ScrollContainer from './ScrollContainer.svelte'

	type LayoutMode = 'both' | 'list' | 'details'

	interface Props {
		mode: LayoutMode
		list: Snippet<[LayoutMode]>
		details: Snippet<[LayoutMode]>
		class?: string
		noPlayerOverlayPadding?: boolean
		noListStableGutter?: boolean
	}

	const {
		mode,
		list,
		details,
		class: className,
		noListStableGutter,
		noPlayerOverlayPadding,
	}: Props = $props()
</script>

<div class={clx('!flex !flex-col', className)}>
	<div class="flex h-full grow">
		{#if mode === 'both'}
			<ScrollContainer
				class={clx(
					'max-h-100vh sticky top-0 flex shrink-0 flex-col overflow-y-auto overscroll-contain',
					!noPlayerOverlayPadding && 'pb-[calc(var(--bottom-overlay-height)+16px)]',
					!noListStableGutter && 'scrollbar-gutter-stable',
				)}
			>
				{@render list(mode)}
			</ScrollContainer>
		{/if}

		<div
			class={clx(
				'flex w-full grow flex-col',
				!noPlayerOverlayPadding && 'pb-[calc(var(--bottom-overlay-height)+16px)]',
			)}
		>
			{#if mode === 'both' || mode === 'details'}
				{@render details(mode)}
			{:else if mode === 'list'}
				{@render list(mode)}
			{/if}
		</div>
	</div>
</div>
