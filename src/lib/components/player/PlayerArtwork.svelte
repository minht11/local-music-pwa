<script lang="ts">
	import Artwork from '../Artwork.svelte'

	interface Props {
		class?: string
		children?: Snippet
	}

	const { ...props }: Props = $props()

	const player = usePlayer()
</script>

<Artwork src={player.artworkSrc} alt={player.activeTrack?.name} {...props} />
