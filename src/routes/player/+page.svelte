<script>
	import PlayerArtwork from '$lib/components/player/PlayerArtwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import TracksListContainer from '$lib/components/tracks/TracksListContainer.svelte'
	import { usePlayer } from '$lib/stores/player/store'
	import MainControls from '$lib/components/player/MainControls.svelte'
	import { useMediaQuery } from '$lib/helpers/use-media-query.svelte'

	const player = usePlayer()
	const track = $derived(player.activeTrack.value)

	const isCompact = useMediaQuery('(max-width: 768px)')
</script>

{#snippet queue()}
	<div class="w-full p-16px flex flex-col rounded-t-24px tonal-elevation-2">
		<div class="flex items-center h-48px">
			<div class="text-title-md mr-auto ml-16px">Queue list</div>

			<Button kind="flat">Clear</Button>
		</div>

		{#if player.itemsIds.length === 0}
			<div class="m-auto text-center flex flex-col items-center gap-8px">
				<div>Your queue is empty</div>
				<Button kind="outlined" as="a" href="/">Play something here</Button>
			</div>
		{:else}
			<TracksListContainer
				items={player.itemsIds}
				onItemClick={({ index }) => {
					player.playTrack(index)
				}}
			/>
		{/if}
	</div>
{/snippet}

<div
	class="w-full max-w-1280px bg-secondaryContainer view-transition-pl-container mx-auto fixed inset-0"
/>
<section class="view-transition-pl-content grow flex flex-col mx-auto w-full max-w-1280px">
	<div class="grow grid grid-cols-[360px_1fr]">
		<div
			class="sticky px-24px lg:px-40px top-[calc(var(--app-header-height)+16px)] h-screen flex flex-col"
		>
			<PlayerArtwork class="rounded-24px view-transition-pl-artwork" />

			<div class="min-w-0 flex flex-col justify-center h-72px">
				{#if track}
					<div class="truncate text-title-lg">{track.name}</div>
					<div class="truncate text-body-md">{track.artists}</div>
				{/if}
			</div>

			<div class="flex items-center justify-center gap-24px">
				<IconButton icon="musicNote" />

				<MainControls />

				<IconButton icon="musicNote" />
			</div>
		</div>
		{#if !isCompact.value}
			{@render queue()}
		{/if}
	</div>
</section>

<style>
	:root::view-transition-old(pl-content) {
		animation: fade-out 75ms linear forwards;
	}

	:root::view-transition-new(pl-content) {
		animation: fade-in 175ms 75ms linear both;
	}

	/* prettier-ignore */
	:root:is([data-view-from='/player'],[data-view-to='/player'])::view-transition-old(pl-container),
	:root:is([data-view-from='/player'],[data-view-to='/player'])::view-transition-new(pl-container) {
		animation: none;
		mix-blend-mode: normal;
	}

	@keyframes player-shape-enter {
		from {
			clip-path: inset(0% 0% calc(100% - 92px) 0% round 24px);
		}
		to {
			clip-path: inset(0% 0% 0% 0% round 0px);
		}
	}

	:root[data-view-to='/player']::view-transition-new(pl-container) {
		animation: player-shape-enter 250ms;
	}

	@keyframes player-shape-exit {
		from {
			clip-path: inset(0% 0% 0% 0% round 0px);
		}
		to {
			clip-path: inset(0% 0% calc(100% - 92px) 0% round 24px);
		}
	}

	:root[data-view-from='/player']::view-transition-old(pl-container) {
		animation: player-shape-exit 250ms forwards;
	}
</style>
