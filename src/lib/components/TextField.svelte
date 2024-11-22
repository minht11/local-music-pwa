<script lang="ts">
	import { nanoid } from 'nanoid'
	import * as v from 'valibot'

	interface TextFieldProps {
		value?: string
		name: string
		type?: 'text'
		placeholder?: string
		minLength?: number
		maxLength?: number
		required?: boolean
	}

	let {
		name,
		value = $bindable(''),
		type = 'text',
		placeholder,
		minLength,
		maxLength,
		required,
	}: TextFieldProps = $props()

	const id = nanoid(6)

	const ValidationsSchema = $derived.by(() => {
		const validators: unknown[] = [v.string()]

		if (required) {
			validators.push(v.minLength(1, m.validationRequired()))
		}

		if (minLength !== undefined) {
			validators.push(v.minLength(minLength, m.validationMinLength({ min: minLength })))
		}

		if (maxLength !== undefined) {
			validators.push(v.maxLength(maxLength, m.validationMaxLength({ max: maxLength })))
		}

		// @ts-expect-error not sure how to type this
		return v.pipe(...validators)
	})

	const validation = $derived(v.safeParse(ValidationsSchema, value))

	let input = $state<HTMLInputElement | null>(null)

	$effect(() => {
		input?.setCustomValidity(validation.success ? '' : ' ')
	})
</script>

<div class="text-field-container">
	<div
		class="rounded-px focus-within:border-0.5 flex h-14 flex-col border border-outline p-px text-onSurface focus-within:border-primary focus-within:p-0 [&:has(input:user-invalid)]:border-error"
	>
		<input
			bind:this={input}
			bind:value
			{name}
			{id}
			{type}
			{required}
			class="w-full grow appearance-none border-none bg-transparent px-3.5 outline-none placeholder:text-onSurfaceVariant"
			{placeholder}
		/>
	</div>
	<div class="text-field-error mt-1 hidden px-4 text-body-sm text-error">
		{validation.issues?.at(0)?.message ?? ''}
	</div>
</div>

<style>
	.text-field-container:has(input:user-invalid) .text-field-error {
		display: block;
	}
</style>
