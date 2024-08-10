<script lang="ts">
	import Artwork from '../Artwork.svelte'
	import type { IconType } from '../icon/Icon.svelte'

	interface Props {
		fallbackIcon?: IconType | null
		class?: string
		children?: Snippet
	}

	const { fallbackIcon, ...props }: Props = $props()

	const player = usePlayer()
</script>

<Artwork
	src={player.artworkSrc}
	alt={player.activeTrack?.name}
	fallbackIcon={player.activeTrack ? undefined : null}
	{...props}
/>
