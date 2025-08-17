<script lang="ts" module>
	import Button, { type AllowedButtonElement, type ButtonProps } from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'

	interface IconButtonProps<As extends AllowedButtonElement> extends ButtonProps<As> {
		tooltip: string
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
	class={[
		'flex size-11 shrink-0 items-center justify-center rounded-full',
		rest.class,
		rest.disabled && 'opacity-54',
	]}
>
	{#if children}
		{@render children()}
	{:else if icon}
		<Icon type={icon} />
	{/if}
</Button>
