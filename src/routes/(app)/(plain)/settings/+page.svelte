<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Select from '$lib/components/Select.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import { supportsChangingAudioVolume } from '$lib/helpers/audio.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { AppMotionOption, AppThemeOption } from '$lib/stores/main/store.svelte.ts'
	import InstallAppBanner from './components/InstallAppBanner.svelte'
	import YTMConnectionSetup from '$lib/components/ytm-connection/YTMConnectionSetup.svelte'

	const mainStore = useMainStore()

	const themeOptions: { name: string; value: AppThemeOption }[] = [
		{
			name: m.settingsThemeAuto(),
			value: 'auto',
		},
		{
			name: m.settingsThemeDark(),
			value: 'dark',
		},
		{
			name: m.settingsThemeLight(),
			value: 'light',
		},
	]

	const motionOptions: { name: string; value: AppMotionOption }[] = [
		{
			name: m.settingsMotionAuto(),
			value: 'auto',
		},
		{
			name: m.settingsMotionReduced(),
			value: 'reduced',
		},
		{
			name: m.settingsMotionNormal(),
			value: 'normal',
		},
	]

	const updateMainColor = debounce((value: string | null) => {
		mainStore.customThemePaletteHex = value
	}, 400)
</script>

<section class="card settings-max-width mx-auto w-full">
	<div class="p-4">
		<YTMConnectionSetup />
	</div>
</section>

<InstallAppBanner class="settings-max-width mt-6" />

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	<div class="px-4 pt-4 text-title-sm">{m.settingsAppearance()}</div>

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsApplicationTheme()}</div>

		<Select
			bind:selected={mainStore.theme}
			items={themeOptions}
			key="value"
			labelKey="name"
			class="w-35"
		/>
	</div>

	<div class="flex items-center justify-between p-4">
		<div>{m.settingPickColorFromArtwork()}</div>

		<Switch bind:checked={mainStore.pickColorFromArtwork} />
	</div>

	<div class="flex flex-col items-center gap-x-2 gap-y-4 p-4 sm:flex-row">
		<div class="mr-auto flex items-center gap-2">
			{m.settingsPrimaryColor()}

			{#if mainStore.customThemePaletteHex}
				<div
					class="pointer-events-none size-6 shrink-0 items-center justify-center rounded-md ring ring-outline/40"
					style:background={mainStore.customThemePaletteHex}
				></div>
			{/if}
		</div>

		<div class="flex items-center gap-2 max-sm:w-full">
			{#if mainStore.customThemePaletteHex}
				<Button
					kind="outlined"
					class="max-sm:w-full"
					disabled={!mainStore.customThemePaletteHex}
					onclick={() => {
						mainStore.customThemePaletteHex = null
					}}
				>
					{m.settingsColorReset()}
				</Button>
			{/if}

			<Button
				kind="toned"
				class="max-sm:w-full"
				onclick={() => {
					const colorPicker = document.getElementById('color-picker') as HTMLInputElement
					colorPicker.click()
				}}
			>
				<Icon type="eyedropper" class="size-5" />

				{m.settingsColorPick()}

				<input
					id="color-picker"
					type="color"
					tabindex="-1"
					bind:value={
						() => mainStore.customThemePaletteHex ?? '#000000', (value) => updateMainColor(value)
					}
					class="pointer-events-none absolute inset-0 h-full w-full appearance-none opacity-0"
				/>
			</Button>
		</div>
	</div>

	<Separator />

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsMotion()}</div>

		<Select
			bind:selected={mainStore.motion}
			items={motionOptions}
			key="value"
			labelKey="name"
			class="w-35"
		/>
	</div>

	<Separator />

	{#if supportsChangingAudioVolume()}
		<div class="flex items-center justify-between p-4">
			<div>
				{m.settingsDisplayVolumeSlider()}
			</div>

			<Switch bind:checked={mainStore.volumeSliderEnabled} />
		</div>
	{/if}
</section>

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	<div class="flex items-center justify-between p-4">
		<div>{m.about()}</div>

		<IconButton as="a" href="/about" tooltip={m.about()} icon="chevronRight" />
	</div>
</section>

<style lang="postcss">
	@reference '../../../../app.css';

	:global(.settings-max-width) {
		max-width: --spacing(225);
	}
</style>
