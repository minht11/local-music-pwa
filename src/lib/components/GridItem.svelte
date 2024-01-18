<script lang="ts">
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import type { Snippet } from 'svelte'
	import Artwork from './Artwork.svelte'
	import { ripple } from '$lib/actions/ripple'

	const {
		artwork,
		class: className,
		children,
		...props
	} = $props<{
		artwork?: Blob
		class?: string
		style?: string
		children: Snippet
		tabindex?: number
		role?: string
		'data-index'?: number
		onclick?: (e: MouseEvent) => void
		onkeydown?: (e: KeyboardEvent) => void
	}>()

	const [artworkSrc] = createManagedArtwork(() => artwork)
</script>

<div use:ripple {...props} class={clx(className, 'flex flex-col interactable rounded-8px')}>
	<Artwork src={artworkSrc()} class="rounded-inherit w-full" />

	<div class="flex flex-col items-center overflow-hidden">
		{@render children()}
	</div>
</div>
