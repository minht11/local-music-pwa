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
		class="h-56px flex flex-col rounded-4px border border-outline focus-within:border-primary [&:has(input:user-invalid)]:border-error text-onSurface p-1px focus-within:p-0 focus-within:border-2px"
	>
		<input
			bind:this={input}
			bind:value
			{name}
			{id}
			{type}
			{required}
			class="w-full placeholder:text-onSurfaceVariant appearance-none grow border-none outline-none bg-transparent px-14px"
			{placeholder}
		/>
	</div>
	<div class="text-field-error text-body-sm text-error px-16px mt-4px hidden">
		{validation.issues?.at(0)?.message ?? ''}
	</div>
</div>

<style>
	.text-field-container:has(input:user-invalid) .text-field-error {
		display: block;
	}
</style>
