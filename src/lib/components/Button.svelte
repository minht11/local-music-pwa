<script context="module" lang="ts">
	export type AllowedButtonElements = 'button' | 'a'
	export type ButtonKind = 'filled' | 'toned' | 'outlined' | 'flat' | 'blank'

	// prettier-ignore
	export type ButtonHref<As extends AllowedButtonElements> = As extends 'a' ? string : never;
</script>

<script lang="ts" generics="As extends AllowedButtonElements = 'button'">
	import { clx } from '$lib/helpers/clx'
	import { ripple } from '../actions/ripple'

	export let as: As = 'button' as As
	export let kind: ButtonKind = 'filled'
	export let disabled = false

	type Href = ButtonHref<As>
	export let href: Href = (as === 'a' ? '' : undefined) as Href

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
	{...$$restProps}
	{href}
	disabled={disabled === true ? true : undefined}
	use:ripple
	class={clx(kind !== 'blank' && clx('base-button px-24px', KIND_CLASS_MAP[kind]), $$props.class)}
	on:click
	on:keydown
>
	<slot />
</svelte:element>

<style lang="postcss">
	.filled-button {
		background: theme(colors.primary);
		color: theme(colors.onPrimary);
	}

	.tonal-button {
		background: theme(colors.secondaryContainer);
		color: theme(colors.onSecondaryContainer);
	}

	:is(.tonal-button, .filled-button)[disabled] {
		background-color: theme(colors.onSurface/12%);
	}

	.outlined-button {
		color: theme(colors.primary);
		border: 1px solid theme(colors.outline);
	}

	.flat-button {
		color: theme(colors.primary);
		padding-left: 12px;
		padding-right: 12px;
	}

	.base-button[disabled] {
		color: theme(colors.onSurface/38%);
		border-color: theme(colors.onSurface/12%);
		cursor: default;
	}
</style>
