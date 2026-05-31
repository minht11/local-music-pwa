<script lang="ts">
	interface Props {
		checked: boolean
		disabled?: boolean
	}

	let { checked = $bindable(false), disabled = false }: Props = $props()

	const toggle = () => {
		if (disabled) {
			return
		}

		checked = !checked
	}

	const getTrackClassNames = () => {
		if (disabled) {
			return checked
				? 'border-transparent bg-onSurface/12'
				: 'border-onSurface/12 bg-surfaceContainerHighest/12'
		}

		return checked ? 'border-transparent bg-primary' : 'border-outline bg-surfaceContainerHigh'
	}

	const getHandleClassNames = () => {
		if (disabled) {
			return checked ? 'bg-surface' : 'bg-onSurface/38'
		}

		return checked ? 'bg-onPrimary' : 'bg-outline'
	}
</script>

<div
	class={[
		'flex h-8 w-13 shrink-0 items-center rounded-4xl border-2 outline-offset-2 transition-all duration-150',
		getTrackClassNames(),
		!disabled && 'cursor-pointer',
	]}
	tabindex="0"
	role="switch"
	aria-checked={checked}
	aria-disabled={disabled}
	onclick={toggle}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			toggle()
		}
	}}
>
	<input type="checkbox" {disabled} bind:checked class="hidden" />
	<div
		class={[
			'ml-1.5 h-4 w-4 rounded-full transition-all duration-150',
			getHandleClassNames(),
			checked && 'translate-x-5 scale-150',
		]}
	></div>
</div>
