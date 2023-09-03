<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
	import type { ComponentProps } from 'svelte'
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import Button, { type AllowedButtonElements } from './Button.svelte'

	type ButtonProps = ComponentProps<Button<As>>
	type Href = ButtonProps['href']

	export let icon: IconType
	export let as: As = 'button' as As
	export let href: Href = (as === 'a' ? '' : undefined) as Href
</script>

<Button
	{...$$restProps}
	{as}
	{href}
	kind="blank"
	class={clx('interactable flex h-44px w-44px items-center rounded-full', $$props.class)}
	on:click
	on:keydown
>
	<Icon class="mx-auto" type={icon} />
</Button>
