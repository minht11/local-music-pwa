<script lang="ts" module>
	import type { Snippet } from 'svelte'
	import Button, { type AllowedButtonElement, type ButtonProps } from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'

	interface IconButtonProps<As extends AllowedButtonElement> extends ButtonProps<As> {
		icon?: IconType
		children?: Snippet
	}
</script>

<script lang="ts" generics="As extends AllowedButtonElement = 'button'">
	const { icon, children, ...rest }: IconButtonProps<As> = $props()
</script>

<Button
	{...rest}
	kind="blank"
	class={clx(
		'interactable flex justify-center shrink-0 h-44px w-44px items-center rounded-full',
		rest.class,
		rest.disabled && 'opacity-54',
	)}
>
	{#if children}
		{@render children()}
	{:else if icon}
		<Icon type={icon} />
	{/if}
</Button>
