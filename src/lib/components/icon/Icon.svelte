<script lang="ts" module>
	import type { IconType } from './icon-paths.ts'

	export type { IconType } from './icon-paths.ts'

	export interface IconProps {
		type: IconType
		class?: ClassValue
	}
</script>

<script lang="ts">
	const { type, class: className }: IconProps = $props()
</script>

<svg
	role="presentation"
	width="24"
	height="24"
	viewBox="0 0 24 24"
	class={['pointer-events-none shrink-0 fill-current', className]}
>
	<use href={`#system-icon-${type}`} />
</svg>
