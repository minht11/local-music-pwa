<script lang="ts">
	import { goto } from '$app/navigation'
	import Icon from '$lib/components/icon/Icon.svelte'

	const player = usePlayer()

	const openPlayLater = () => {
		void goto('/library/bookmarks/play-later')
	}
</script>

<button
	class="flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-surfaceContainerHigh px-4 py-4 text-left"
	onclick={openPlayLater}
>
	<div class="flex size-12 items-center justify-center rounded-2xl bg-secondaryContainer text-onSecondaryContainer">
		<Icon type="playlistMusic" />
	</div>

	<div class="min-w-0 flex-1">
		<div class="text-body-lg text-onSurface">Play later</div>
		<div class="text-body-sm text-onSurfaceVariant">
			{player.itemsIds.length} {player.itemsIds.length === 1 ? 'saved discourse' : 'saved discourses'}
		</div>
	</div>

	<Icon type="chevronRight" class="text-onSurfaceVariant" />
</button>
