<script lang="ts" module>
	import ScrollContainer from './ScrollContainer.svelte'

	// prettier-ignore
	export type LayoutMode = 'both' | 'list' | 'details';
</script>

<script lang="ts">
	interface Props {
		id?: string
		mode: LayoutMode
		list: Snippet<[LayoutMode]>
		details: Snippet<[LayoutMode]>
		class?: ClassValue
		noPlayerOverlayPadding?: boolean
		noListStableGutter?: boolean
	}

	const {
		id,
		mode,
		list,
		details,
		class: className,
		noListStableGutter,
		noPlayerOverlayPadding,
	}: Props = $props()

	let listOffsetWidth = $state(0)
	let isBothMode = $derived(mode === 'both')
</script>

<div {id} class={['!flex !flex-col', className]}>
	<div class="flex h-full grow">
		{#if isBothMode}
			<ScrollContainer
				bind:offsetWidth={listOffsetWidth}
				class={[
					'fixed top-0 flex max-h-[100svh] min-h-full shrink-0 flex-col overflow-y-auto overscroll-contain',
					!noPlayerOverlayPadding && 'pb-[calc(var(--bottom-overlay-height)+16px)]',
					!noListStableGutter && 'scrollbar-gutter-stable',
				]}
			>
				{@render list(mode)}
			</ScrollContainer>
		{/if}

		<div
			class={[
				'flex w-full grow flex-col',
				!noPlayerOverlayPadding && 'pb-[calc(var(--bottom-overlay-height)+16px)]',
			]}
			style={isBothMode ? `padding-left: ${listOffsetWidth}px;` : undefined}
		>
			{#if isBothMode || mode === 'details'}
				{@render details(mode)}
			{:else if mode === 'list'}
				{@render list(mode)}
			{/if}
		</div>
	</div>
</div>
