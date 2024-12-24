<script lang="ts" module>
	import { ICON_PATHS } from './icon-paths.ts'

	export type IconType = keyof typeof ICON_PATHS

	export interface IconProps {
		type: IconType
		class?: ClassNameValue
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
	<path d={ICON_PATHS[type]} />
</svg>
