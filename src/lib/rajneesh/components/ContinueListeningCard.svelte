<script lang="ts">
	import Artwork from '$lib/components/Artwork.svelte'
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import type { TrackData } from '$lib/library/get/value.ts'
	import type { Album } from '$lib/library/types.ts'

	interface ResumeCardData {
		track: TrackData
		album: Album | undefined
		listenedMinutes: number
	}

	interface Props {
		card: ResumeCardData
		onResume: () => void
	}

	const { card, onResume }: Props = $props()

	const artworkSrc = createManagedArtwork(() => card.album?.image ?? card.track?.image?.small)
	const listenedLabel = $derived.by(() => {
		if (card.listenedMinutes < 60) {
			return 'few minutes listened'
		}

		const hours = Math.floor(card.listenedMinutes / 60)
		return `${hours} hour${hours === 1 ? '' : 's'} listened`
	})
</script>

<div class="relative z-0 flex h-full w-full flex-col overflow-clip rounded-2xl bg-surfaceContainerHigh">
	<div class="flex grow flex-col gap-3 p-4">
		<div class="flex items-center gap-4">
			<Artwork
				src={artworkSrc()}
				fallbackIcon="album"
				alt={card.track.name}
				class="h-16 w-16 shrink-0 rounded-xl"
			/>
			<div class="flex min-w-0 flex-col">
				<div class="line-clamp-2 text-headline-sm">
					{formatNameOrUnknown(card.track.name)}
				</div>
				<div class="text-body-sm opacity-70">
					{listenedLabel}
				</div>
			</div>
		</div>
	</div>

	<div class="mt-auto flex flex-col gap-2 py-4 pr-2 pl-4">
		<Button kind="filled" class="my-1 w-full" onclick={onResume}>
			Continue listening
			<Icon type="play" />
		</Button>
	</div>
</div>
