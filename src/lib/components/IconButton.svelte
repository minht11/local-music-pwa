<script lang="ts" context="module">
	import { clx } from '$lib/helpers/clx'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import Button, { type AllowedButtonElements, type ButtonProps } from './Button.svelte'

	interface IconButtonProps<As extends AllowedButtonElements> extends ButtonProps<As> {
		icon: IconType
	}
</script>

<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
	const { icon, ...rest } = $props<IconButtonProps<As>>()
</script>

<Button
	{...rest}
	kind="blank"
	class={clx('interactable flex h-44px w-44px items-center rounded-full', rest.class)}
>
	<Icon class="mx-auto" type={icon} />
</Button>
