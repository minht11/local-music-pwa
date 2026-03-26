<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import ActiveIndicator from '$lib/components/player/buttons/ActiveIndicator.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import { BG_MUSIC_OPTIONS } from '$lib/rajneesh/pages/shorts/bg-music-state.ts'
	import {
		bgMusicState,
		initializeBgMusic,
		pauseBgMusic,
		retainBgMusicConsumer,
		selectBgMusic,
		syncBgMusic,
		updateBgMusicVolume,
	} from '$lib/rajneesh/stores/bg-music.svelte.ts'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()
	let showPicker = $state(false)
	let buttonEl: HTMLDivElement
	let pickerEl: HTMLDivElement | undefined
	let pickerTop = $state(0)
	let pickerRight = $state(0)
	initializeBgMusic()

	$effect(() => {
		const releaseConsumer = retainBgMusicConsumer()
		return releaseConsumer
	})

	function portal(node: HTMLElement) {
		document.body.appendChild(node)
		return {
			destroy() {
				node.remove()
			},
		}
	}

	function updatePickerPosition() {
		if (!buttonEl) return
		const rect = buttonEl.getBoundingClientRect()
		pickerRight = window.innerWidth - rect.right
		pickerTop = rect.top
	}

	function togglePicker() {
		if (showPicker) {
			showPicker = false
			return
		}
		updatePickerPosition()
		showPicker = true
	}

	$effect(() => {
		if (player.playing && !player.loading) {
			syncBgMusic()
		} else {
			pauseBgMusic()
		}
	})

	$effect(() => {
		if (!showPicker) return
		const handler = (e: MouseEvent) => {
			if (pickerEl?.contains(e.target as Node)) return
			if (buttonEl?.contains(e.target as Node)) return
			showPicker = false
		}
		setTimeout(() => document.addEventListener('click', handler), 0)
		return () => document.removeEventListener('click', handler)
	})
</script>

<div bind:this={buttonEl}>
	<IconButton
		tooltip="Background Music"
		class={className}
		onclick={togglePicker}
	>
		<Icon
			type="vinylDisc"
			class={['disc-spin-bg', bgMusicState.bgMusicPlaying && 'disc-spin-bg-playing']}
		/>
		<ActiveIndicator active={bgMusicState.selectedBgMusicId !== 'none'} />
	</IconButton>
</div>

{#if showPicker}
	<div
		bind:this={pickerEl}
		use:portal
		class="fixed z-50 min-w-48 rounded-2xl bg-surfaceContainer/95 px-3 py-3 text-onSurface shadow-xl backdrop-blur-lg"
		style="right: {pickerRight}px; bottom: calc(100dvh - {pickerTop}px + 8px);"
	>
		<div class="px-3 pb-2 pt-1 text-body-sm font-medium opacity-50">Background Music</div>
		{#each BG_MUSIC_OPTIONS as option (option.id)}
			<button
				onclick={() => { selectBgMusic(option.id, player.playing); showPicker = false }}
				class={[
					'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-sm transition-colors',
					bgMusicState.selectedBgMusicId === option.id
						? 'bg-secondaryContainer/80 text-onSecondaryContainer'
						: 'text-onSurface/80 hover:bg-onSurface/5',
				]}
			>
				<Icon
					type={option.url ? 'musicNote' : 'close'}
					class="size-4 shrink-0"
				/>
				<span>{option.title}</span>
			</button>
		{/each}

		{#if bgMusicState.selectedBgMusicId !== 'none'}
			<div class="mt-1 border-t border-onSurface/10 px-1 pt-3 pb-1">
				<div class="flex items-center gap-2">
					<Icon type="volumeMid" class="size-3.5 shrink-0 opacity-50" />
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						bind:value={bgMusicState.bgVolume}
						oninput={() => updateBgMusicVolume(bgMusicState.bgVolume)}
						class="bg-music-slider flex-1"
					/>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(.disc-spin-bg) {
		animation: spin 3s linear infinite;
		animation-play-state: paused;
	}
	:global(.disc-spin-bg-playing) {
		animation-play-state: running;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.bg-music-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 3px;
		border-radius: 2px;
		background: currentColor;
		opacity: 0.25;
		outline: none;
	}
	.bg-music-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
	.bg-music-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border: none;
		border-radius: 50%;
		background: currentColor;
		cursor: pointer;
	}
</style>
