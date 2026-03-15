<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Dialog from '$lib/components/dialog/Dialog.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import {
		type BuiltinEqPresetKey,
		EQ_BANDS,
		EQ_MAX_GAIN,
		EQ_MIN_GAIN,
	} from '$lib/stores/player/equalizer.svelte.ts'

	let { open = $bindable(false) }: { open?: boolean } = $props()

	const player = usePlayer()
	const eq = $derived(player.equalizer)

	const presets: [BuiltinEqPresetKey, string][] = [
		['flat', m.equalizerPresetFlat()],
		['bassBoost', m.equalizerPresetBassBoost()],
		['trebleBoost', m.equalizerPresetTrebleBoost()],
		['rock', m.equalizerPresetRock()],
		['pop', m.equalizerPresetPop()],
		['jazz', m.equalizerPresetJazz()],
		['classical', m.equalizerPresetClassical()],
		['electronic', m.equalizerPresetElectronic()],
		['acoustic', m.equalizerPresetAcoustic()],
	]
</script>

<Dialog bind:open class="[--dialog-width:--spacing(160)]">
	{#snippet header()}
		<header data-dialog-header class="flex items-center justify-between px-6 py-6">
			<div class="text-headline-sm">{m.equalizerTitle()}</div>

			<Switch bind:checked={eq.enabled} />
		</header>
	{/snippet}

	{#snippet children({ close })}
		<div data-dialog-content class="flex flex-col">
			<Separator />

			<div class="mb-2 flex gap-2 overflow-x-auto px-6 pt-4 pb-4">
				{#each presets as [preset, label]}
					<button
						type="button"
						class={[
							'interactable shrink-0 rounded-full px-3 py-1 text-label-lg transition-colors',
							eq.selectedPreset === preset
								? 'bg-primary text-onPrimary'
								: 'bg-secondaryContainer text-onSecondaryContainer',
						]}
						onclick={() => eq.applyPreset(preset)}
					>
						{label}
					</button>
				{/each}
			</div>

			<div
				class="sliders-columns grid gap-3 overflow-x-auto overflow-y-hidden overscroll-none px-4 pb-3"
			>
				{#each EQ_BANDS as band, i}
					{@const gain = eq.bands[i] ?? 0}
					<div class="flex flex-col items-center gap-2">
						<span class="text-label-sm tabular-nums">
							{gain > 0 ? '+' : ''}{Math.round(gain)}
						</span>
						<div class="h-40">
							<Slider
								vertical
								min={EQ_MIN_GAIN}
								max={EQ_MAX_GAIN}
								step={0.5}
								bind:value={() => gain, (v) => eq.setBand(i, v)}
								disabled={!eq.enabled}
							/>
						</div>
						<span class="text-label-sm text-onSurfaceVariant tabular-nums">{band.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<div data-dialog-footer class="flex items-center justify-between px-6 pt-3 pb-6">
			<Button kind="outlined" onclick={() => eq.reset()}>{m.equalizerReset()}</Button>
			<Button kind="flat" onclick={close}>{m.equalizerClose()}</Button>
		</div>
	{/snippet}
</Dialog>

<style>
	@reference '../../../app.css';
	.sliders-columns {
		grid-template-columns: repeat(10, minmax(--spacing(12), 1fr));
	}
</style>
