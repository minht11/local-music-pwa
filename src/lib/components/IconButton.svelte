<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
  import type { ComponentProps } from 'svelte';
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import Button, { type AllowedButtonElements } from './Button.svelte'

	type ButtonProps = ComponentProps<Button<As>>

	export let icon: IconType
	export let as: ButtonProps['as']
	export let href: ButtonProps['href']
</script>

<Button
	{...$$restProps}
	as={as}
	href={href}
	kind="blank"
	class={clx('interactable flex h-44 w-44 items-center rounded-full', $$props.class)}
	on:click
	on:keydown
>
	<Icon class="mx-auto" type={icon} />
</Button>
