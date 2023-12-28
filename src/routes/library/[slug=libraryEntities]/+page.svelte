<script lang="ts">
	import { createVirtualizer } from '@tanstack/svelte-virtual'
	import TrackListItem from '$lib/components/TrackListItem.svelte'
	import { useScrollTarget } from '$lib/helpers/scroll-target.svelte.js'
	import { ripple } from '$lib/actions/ripple'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { usePlayer } from '$lib/stores/player/store.ts'

	const { data } = $props()

	const scrollTarget = useScrollTarget()

	const rowVirtualizer = createVirtualizer({
		count: data.store.data.length,
		getScrollElement: scrollTarget,
		estimateSize: () => 72,
		overscan: 10,
	})

	const { store } = data

	store.mountSetup()

	const player = usePlayer()
</script>

<div class="ml-auto flex gap-8px w-max">
	<button
		use:ripple
		class="flex interactable rounded-8px h-32px px-8px gap-4px items-center text-label-md"
	>
		Name

		<Icon type="chevronDown" class="h-16px w-16px" />
	</button>

	<Button kind="flat">Name</Button>

	<IconButton
		onclick={() => {
			if (store.order === 'asc') {
				store.order = 'desc'
			} else {
				store.order = 'asc'
			}
		}}
	>
		<Icon
			type="sortAscending"
			class={clx(
				'[--icon-size:20px] transition-transform',
				store.order === 'desc' && '-rotate-180deg',
			)}
		/>
	</IconButton>
</div>

<div style:height={`${$rowVirtualizer.getTotalSize()}px`} class="contain-strict relative w-full">
	{#each $rowVirtualizer.getVirtualItems() as virtualItem (data.store.data[virtualItem.index])}
		{@const trackId = data.store.data[virtualItem.index]}
		{#if trackId}
			<TrackListItem
				{trackId}
				style={[
					'contain: strict',
					'will-change: transform;',
					'position: absolute',
					'top: 0',
					'left: 0',
					'width: 100%',
					`height: ${virtualItem.size}px`,
					`transform: translateY(${virtualItem.start}px)`,
				].join(';')}
				onclick={() => {
					player.playTrack(virtualItem.index, data.store.data)
				}}
			/>
		{/if}
	{/each}
</div>
