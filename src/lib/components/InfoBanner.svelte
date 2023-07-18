<script lang="ts">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'

	export let icon: IconType = 'alertCircle'
</script>

<div
	class={clx(
		'flex select-text flex-col gap-16 rounded-8 border border-solid border-outlineVariant p-16 text-outline sm:flex-row sm:items-center',
		$$props.class,
	)}
>
	<Icon type={icon} class="flex-shrink-0 text-outline" />

	<span>
		<slot />
	</span>
</div>
