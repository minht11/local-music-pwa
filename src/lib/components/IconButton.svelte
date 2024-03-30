<script lang="ts" context="module">
	import Icon, { type IconType } from './icon/Icon.svelte'
	import Button, { type AllowedButtonElements, type ButtonProps } from './Button.svelte'

	interface IconButtonProps<As extends AllowedButtonElements> extends ButtonProps<As> {
		icon?: IconType
		children?: Snippet
	}
</script>

<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
	const { icon, children, ...rest }: IconButtonProps<As> = $props()
</script>

<Button
	{...rest}
	kind="blank"
	class={clx(
		'interactable flex justify-center shrink-0 h-44px w-44px items-center rounded-full',
		rest.class,
	)}
>
	{#if children}
		{@render children()}
	{:else if icon}
		<Icon type={icon} />
	{/if}
</Button>
