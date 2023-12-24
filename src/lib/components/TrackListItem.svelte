<script lang="ts">
	import { useTrack } from '$lib/library/tracks.svelte.ts'

	const { trackId } = $props<{ trackId: number }>()

	const data = useTrack(trackId)
</script>

<div class="flex flex-col h-72px">
	{#if data.loading === true}
		Loading...
	{:else}
		{@const track = data.track}
		<div>
			{track.name}
		</div>
		<div>
			{track.duration}
		</div>
	{/if}
</div>
