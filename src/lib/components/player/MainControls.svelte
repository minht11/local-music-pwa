<script lang="ts">
	import PlayNextButton from './buttons/PlayNextButton.svelte'
	import PlayPrevButton from './buttons/PlayPrevButton.svelte'
	import PlayTogglePillButton from './buttons/PlayTogglePillButton.svelte'

	const { class: className } = $props<{ class?: string }>()
</script>

<div class={clx('flex gap-8px items-center', className)}>
	<PlayPrevButton />

	<PlayTogglePillButton />

	<PlayNextButton />
</div>
