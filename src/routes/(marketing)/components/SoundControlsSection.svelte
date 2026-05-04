<script lang="ts">
	import equalizerPreview from '../assets/marketing-equalizer-preview.avif?as=metadata'
	import Section from './Section.svelte'
</script>

<Section
	class="mktg-content-width"
	label="Sound controls"
	labelColor="tertiary"
	title="Adjust the sound, set your pace"
>
	<div class="grid gap-4 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.24fr)] lg:items-center">
		<div class="marketing-scroll-enter-soft flex flex-col justify-center gap-8 py-2 max-sm:gap-6">
			<div class="max-w-xl">
				<div class="mb-2 text-label-md text-tertiary">Built-in equalizer</div>
				<h3 class="text-title-lg font-semibold text-onSurface">
					Tune the equalizer for your headphones or speakers
				</h3>
				<p class="mt-2 text-body-lg leading-relaxed text-onSurfaceVariant">
					Start with a preset, then fine-tune each band until the sound is right.
				</p>
			</div>

			<div class="max-w-xl">
				<div class="mb-2 text-label-md text-secondary">Playback speed</div>
				<h3 class="text-title-lg font-semibold text-onSurface">Listen at any speed</h3>
				<p class="mt-2 text-body-lg leading-relaxed text-onSurfaceVariant">
					Slow down for closer listening or move through albums and long mixes at your own pace.
				</p>
			</div>
		</div>

		<div class="equalizer-stage marketing-scroll-enter-soft relative pt-1">
			<div class="equalizer-shot-wrap relative overflow-hidden rounded-[1.9rem]">
				<img
					src={equalizerPreview.src}
					width={equalizerPreview.width}
					height={equalizerPreview.height}
					alt="Snae Player equalizer dialog in dark mode with Bass Boost enabled"
					class="equalizer-shot absolute top-5 left-[4%] block h-auto max-w-none rounded-[1.4rem] shadow-[0_28px_56px_--alpha(var(--color-shadow)/0.26),0_0_0_1px_--alpha(var(--color-outline)/0.08)]"
				/>
			</div>
		</div>
	</div>
</Section>

<style>
	@reference '../../../app.css';

	.equalizer-shot-wrap {
		min-height: 18.5rem;
		background:
			radial-gradient(circle at 18% 20%, --alpha(var(--color-tertiary) / 0.2), transparent 36%),
			radial-gradient(circle at 80% 82%, --alpha(var(--color-primary) / 0.12), transparent 34%),
			linear-gradient(180deg, --alpha(var(--color-surfaceContainerHighest) / 0.18), transparent);
	}

	.equalizer-shot-wrap::before {
		content: '';
		position: absolute;
		inset: auto auto 1rem 1rem;
		width: 13rem;
		height: 13rem;
		border-radius: 999px;
		background: --alpha(var(--color-tertiary) / 0.16);
		filter: blur(42px);
		pointer-events: none;
	}

	.equalizer-shot-wrap::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px --alpha(var(--color-outline) / 0.08);
		pointer-events: none;
	}

	.equalizer-shot {
		width: 92%;
		transform: rotate(-2.5deg);
	}

	@media (width < --theme(--breakpoint-sm)) {
		.equalizer-shot-wrap {
			min-height: 15.5rem;
		}

		.equalizer-shot-wrap::before {
			width: 8rem;
			height: 8rem;
			inset: auto auto 0.5rem 0.5rem;
			filter: blur(28px);
		}

		.equalizer-shot {
			top: --spacing(3.5);
			left: 1%;
			width: 104%;
			transform: rotate(-2deg);
		}
	}
</style>
