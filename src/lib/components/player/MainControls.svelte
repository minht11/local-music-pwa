<script lang="ts">
	import PlayNextButton from './buttons/PlayNextButton.svelte'
	import PlayPrevButton from './buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from './buttons/PlayTogglePillButton.svelte'
	import RepeatButton from './buttons/RepeatButton.svelte'
	import ShuffleButton from './buttons/ShuffleButton.svelte'

	const { class: className } = $props<{ class?: string }>()
</script>

<div class={clx('flex gap-8px items-center', className)}>
	<ShuffleButton />

	<PlayPrevButton />

	<PlayTogglePillButton />

	<PlayNextButton />

	<RepeatButton />
</div>
