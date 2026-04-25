<script lang="ts">
	interface TextFieldProps {
		value?: string
		name: string
		type?: 'text'
		placeholder?: string
		minLength?: number
		maxLength?: number
		required?: boolean
		class?: ClassValue
	}

	let {
		name,
		value = $bindable(''),
		type = 'text',
		placeholder,
		minLength,
		maxLength,
		required,
		class: className,
	}: TextFieldProps = $props()

	const id = $props.id()

	const validationIssue = $derived.by(() => {
		const valueLength = value.length
		if (required && valueLength < 1) {
			return m.validationRequired()
		}

		if (minLength !== undefined && valueLength < minLength) {
			return m.validationMinLength({ min: minLength })
		}

		if (maxLength !== undefined && valueLength > maxLength) {
			return m.validationMaxLength({ max: maxLength })
		}

		return null
	})
</script>

<div class={[className, 'text-field-container']}>
	<div
		class="flex h-14 flex-col rounded-md border border-outline p-px text-onSurface focus-within:border-2 focus-within:border-primary focus-within:p-0 [&:has(input:user-invalid)]:border-error"
	>
		<input
			bind:value
			{name}
			{id}
			{type}
			{required}
			class="w-full grow appearance-none border-none bg-transparent px-3.5 outline-none placeholder:text-onSurfaceVariant"
			{placeholder}
			{@attach (input) => {
				input.setCustomValidity(validationIssue ? ' ' : '')
			}}
		/>
	</div>
	<div class="text-field-error mt-1 hidden px-4 text-body-sm text-error">
		{validationIssue ?? ''}
	</div>
</div>

<style>
	.text-field-container:has(input:user-invalid) .text-field-error {
		display: block;
	}
</style>
