<script lang="ts">
	import * as m from '$paraglide/messages'

	const { data } = $props()

	const { time } = data
</script>

<div>{$time}</div>
<h1>Inside page</h1>

{m.removingSelectedTracks({
	count: 1,
})}

<div class="h-200vh flex-shrink-0">
	<h1>Top level</h1>
</div>
