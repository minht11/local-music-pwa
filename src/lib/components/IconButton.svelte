<script lang="ts">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import Button, { type As } from './Button.svelte'

	export let icon: IconType
	export let as: As = 'button'
</script>

<Button
	{...$$restProps}
	{as}
	kind="blank"
	class={clx('interactable flex h-44 w-44 items-center rounded-full', $$props.class)}
	on:click
	on:keydown
>
	<Icon class="mx-auto" type={icon} />
</Button>
