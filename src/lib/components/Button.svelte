<script module lang="ts">
	import { clx } from '$lib/helpers/clx'
	import type { Snippet } from 'svelte'
	import { ripple } from '../actions/ripple.ts'
	import { tooltip } from '../actions/tooltip.ts'

	export type AllowedButtonElement = 'button' | 'a'
	export type ButtonKind = 'filled' | 'toned' | 'outlined' | 'flat' | 'blank'

	export type ButtonHref<As extends AllowedButtonElement> = As extends 'a' ? string : never

	// prettier-ignore
	export interface ButtonProps<As extends AllowedButtonElement> {
		as?: As
		kind?: ButtonKind
		type?: 'button' | 'submit' | 'reset'
		disabled?: boolean
		href?: ButtonHref<As>
		class?: string
		title?: string
		tabindex?: number
		ariaLabel?: string
		tooltip?: string
		children?: Snippet
		onclick?: (event: MouseEvent) => void
	}
</script>

<script lang="ts" generics="As extends AllowedButtonElement = 'button'">
	const {
		as = 'button' as As,
		kind = 'filled',
		disabled = false,
		href = (as === 'a' ? '' : undefined) as ButtonHref<As>,
		type = 'button',
		children,
		ariaLabel,
		tooltip: tooltipMessage,
		...restProps
	}: ButtonProps<As> = $props()

	const KIND_CLASS_MAP = {
		filled: 'filled-button',
		toned: 'tonal-button',
		outlined: 'outlined-button',
		flat: 'flat-button',
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={!disabled ? as : 'button'}
	use:ripple={{ stopPropagation: true }}
	use:tooltip={tooltipMessage}
	{...restProps}
	{type}
	aria-label={ariaLabel}
	{href}
	disabled={disabled === true ? true : undefined}
	class={clx(
		kind === 'blank' ? 'interactable' : clx('base-button px-24px', KIND_CLASS_MAP[kind]),
		restProps.class,
		disabled && '!cursor-default',
	)}
>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>

<style>
	.filled-button {
		background: theme('colors.primary');
		color: theme('colors.onPrimary');
	}

	.tonal-button {
		background: theme('colors.secondaryContainer');
		color: theme('colors.onSecondaryContainer');
	}

	:is(.tonal-button, .filled-button)[disabled] {
		/* @apply bg-onSurface/12%; */
		background: theme('colors.onSurface/12%');
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
