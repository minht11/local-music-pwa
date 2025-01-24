<script module lang="ts">
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
		class?: ClassNameValue
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
		blank: '',
	} as const
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
	class={[
		'interactable',
		KIND_CLASS_MAP[kind],
		kind !== 'blank' &&
			'base-button interactable flex h-10 items-center justify-center gap-2 rounded-3xl px-6 text-label-lg',
		restProps.class,
		disabled && '!cursor-default',
	]}
>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>

<style>
	@reference '../../app.css';

	.filled-button {
		background: var(--color-primary);
		color: var(--color-onPrimary);
	}

	.tonal-button {
		background: var(--color-secondaryContainer);
		color: var(--color-onSecondaryContainer);
	}

	.outlined-button {
		color: var(--color-primary);
		border: 1px solid var(--color-outline);
	}

	.flat-button {
		color: var(--color-primary);
		padding-left: --spacing(3);
		padding-right: --spacing(3);
	}

	.base-button[disabled] {
		cursor: default;
		background-color: --alpha(var(--color-onSurface) / 38%);
		border-color: --alpha(var(--color-onSurface) / 38%);
	}

	:is(.tonal-button, .filled-button)[disabled] {
		background-color: --alpha(var(--color-onSurface) / 12%);
	}

	.base-button:focus-visible,
	.base-button:hover:focus-visible {
		outline: --spacing(0.5) solid var(--color-onSurface) !important;
		outline-offset: --spacing(-0.5);
	}
</style>
