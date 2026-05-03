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
					Make it sound right on your setup
				</h3>
				<p class="mt-2 text-body-lg leading-relaxed text-onSurfaceVariant">
					Start with a preset, then fine-tune the bands until your music hits the way you want
					through your headphones or speakers.
				</p>
			</div>

			<div class="max-w-xl">
				<div class="mb-2 text-label-md text-secondary">Playback speed</div>
				<h3 class="text-title-lg font-semibold text-onSurface">Listen at any speed</h3>
				<p class="mt-2 text-body-lg leading-relaxed text-onSurfaceVariant">
					Slow things down for closer listening or speed them up when you want to move through long
					mixes, podcasts, or audiobooks faster.
				</p>
			</div>
		</div>

		<div class="equalizer-stage marketing-scroll-enter-soft pt-1">
			<div class="equalizer-shot-wrap">
				<img
					src={equalizerPreview.src}
					width={equalizerPreview.width}
					height={equalizerPreview.height}
					alt="Snae Player equalizer dialog in dark mode with Bass Boost enabled"
					class="equalizer-shot"
				/>
			</div>
		</div>
	</div>
</Section>

<style>
	.equalizer-stage {
		position: relative;
	}

	.equalizer-shot-wrap {
		position: relative;
		min-height: 18.5rem;
		overflow: hidden;
		border-radius: 1.9rem;
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
		position: absolute;
		left: 4%;
		top: 1.25rem;
		display: block;
		width: 92%;
		max-width: none;
		height: auto;
		border-radius: 1.4rem;
		transform: rotate(-2.5deg);
		box-shadow:
			0 28px 56px --alpha(var(--color-shadow) / 0.26),
			0 0 0 1px --alpha(var(--color-outline) / 0.08);
	}

	@media (max-width: 639px) {
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
			top: 0.9rem;
			left: 1%;
			width: 104%;
			transform: rotate(-2deg);
		}
	}
</style>
