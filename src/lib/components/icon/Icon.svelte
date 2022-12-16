<script lang="ts" context="module">
	import { clx } from '$lib/helpers/clx'
	import { ICON_PATHS } from './icon-paths'

	export type IconType = keyof typeof ICON_PATHS
</script>

<script lang="ts">
	export let type: IconType
</script>

<svg
	width="24"
	height="24"
	viewBox="0 0 24 24"
	class={clx('fill-current pointer-events-none', $$props.class)}
>
	<path d={ICON_PATHS[type]} />
</svg>
