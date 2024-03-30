<script context="module" lang="ts">
	import { clx } from '$lib/helpers/clx'
	import { ripple } from '../actions/ripple'

	export type AllowedButtonElements = 'button' | 'a'
	export type ButtonKind = 'filled' | 'toned' | 'outlined' | 'flat' | 'blank'

	export type ButtonHref<As extends AllowedButtonElements> = As extends 'a' ? string : never

	// prettier-ignore
	export interface ButtonProps<As extends AllowedButtonElements> {
		as?: As
		kind?: ButtonKind
		disabled?: boolean
		href?: ButtonHref<As>
		class?: string
		title?: string
		tabindex?: number
		ariaLabel?: string
		children?: Snippet
		onclick?: (event: MouseEvent) => void
	}
</script>

<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
	const {
		as = 'button',
		kind = 'filled',
		disabled = false,
		href = as === 'a' ? '' : undefined,
		children,
		ariaLabel,
		...restProps
	}: ButtonProps<As> = $props()

	const KIND_CLASS_MAP = {
		filled: 'filled-button',
		toned: 'tonal-button',
		outlined: 'outlined-button',
		flat: 'flat-button',
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<svelte:element
	this={!disabled ? as : 'button'}
	{...restProps}
	aria-label={ariaLabel}
	{href}
	disabled={disabled === true ? true : undefined}
	use:ripple
	class={clx(
		kind === 'blank' ? 'interactable' : clx('base-button px-24px', KIND_CLASS_MAP[kind]),
		restProps.class,
	)}
>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>

<style lang="postcss">
	.filled-button {
		background: theme('colors.primary');
		color: theme('colors.onPrimary');
	}

	.tonal-button {
		background: theme('colors.secondaryContainer');
		color: theme('colors.onSecondaryContainer');
	}

	:is(.tonal-button, .filled-button)[disabled] {
		@apply bg-onSurface/12%;
	}

	.outlined-button {
		color: theme('colors.primary');
		border: 1px solid theme('colors.outline');
	}

	.flat-button {
		color: theme('colors.primary');
		padding-left: 12px;
		padding-right: 12px;
	}

	.base-button[disabled] {
		cursor: default;
		background-color: theme('colors.onSurface/38%');
		border-color: theme('colors.onSurface/38%');
	}

	.base-button:focus-visible,
	.base-button:hover:focus-visible {
		outline: 2px solid theme('colors.onSurface') !important;
		outline-offset: -2px;
	}
</style>
