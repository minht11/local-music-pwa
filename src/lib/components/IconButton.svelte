<script lang="ts">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'

	export let icon: IconType
	export let as: 'button' | 'a' = 'button'
</script>

<svelte:element
	this={as}
	{...$$restProps}
	class={clx('flex items-center rounded-full h-44 w-44', $$props.class)}
>
	<Icon class="mx-auto" type={icon} />
</svelte:element>
