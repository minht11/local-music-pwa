<script lang="ts">
	import ScrollContainer from './ScrollContainer.svelte'

	type LayoutMode = 'both' | 'list' | 'details'

	interface Props {
		mode: LayoutMode
		list: Snippet<[LayoutMode]>
		details: Snippet<[LayoutMode]>
		class?: string
		noPlayerOverlayPadding?: boolean
	}

	const { mode, list, details, class: className, noPlayerOverlayPadding }: Props = $props()
</script>

<div class={clx('!flex !flex-col', className)}>
	<div class="flex h-full grow">
		{#if mode === 'both'}
			<ScrollContainer
				class={clx(
					'overflow-y-auto max-h-100vh shrink-0 sticky top-0 overscroll-contain flex flex-col',
					!noPlayerOverlayPadding && 'pb-[var(--bottom-overlay-height)]',
				)}
			>
				{@render list(mode)}
			</ScrollContainer>
		{/if}

		<div
			class={clx(
				'w-full grow flex flex-col',
				!noPlayerOverlayPadding && 'pb-[var(--bottom-overlay-height)]',
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
