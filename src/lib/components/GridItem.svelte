<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import Artwork from './Artwork.svelte'

	interface Props {
		artwork?: Blob
		class?: ClassValue
		style?: string
		children: Snippet
		tabindex?: number
		role?: string
		'data-index'?: number
		onclick?: (e: MouseEvent) => void
		onkeydown?: (e: KeyboardEvent) => void
	}

	const { artwork, class: className, children, ...props }: Props = $props()

	const artworkSrc = createManagedArtwork(() => artwork)
</script>

<div
	use:ripple
	{...props}
	class={[className, 'interactable flex flex-col rounded-lg bg-surfaceContainerHigh']}
>
	<Artwork src={artworkSrc()} fallbackIcon="person" class="w-full rounded-[inherit]" />

	<div class="flex flex-col items-center overflow-hidden">
		{@render children()}
	</div>
</div>
