<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { toggleFavoriteTrack } from '$lib/library/playlists-actions'

	interface FavoriteButtonProps {
		trackId: number
		favorite: boolean
		class?: string
	}

	const { trackId, favorite, class: className }: FavoriteButtonProps = $props()

	const clickHandler = async (e: MouseEvent) => {
		e.stopPropagation()

		const success = await toggleFavoriteTrack(favorite, trackId)
		if (!success) {
			return
		}

		const icon = (e.target as HTMLElement)?.querySelector('svg')
		if (!icon) {
			return
		}

		icon.animate(
			{
				transform: ['scale(1)', 'scale(0.6)', 'scale(1)'],
			},
			{
				duration: 400,
				easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
			},
		)
	}
</script>

<IconButton
	class={className}
	icon={favorite ? 'favorite' : 'favoriteOutline'}
	tooltip={favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites()}
	onclick={clickHandler}
/>
