<script lang="ts">
	import { tooltip } from '$lib/attachments/tooltip.ts'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Select from '$lib/components/Select.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import { isDatabaseOperationPending } from '$lib/db/lock-database.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { supportsChangingAudioVolume } from '$lib/helpers/audio.ts'
	import { Debounced } from '$lib/helpers/debounced.svelte.ts'
	import { isFileSystemAccessSupported } from '$lib/helpers/file-system.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { AppMotionOption, AppThemeOption } from '$lib/stores/main/store.svelte.ts'
	import {
		PLAYER_PLAYBACK_RATE_MAX,
		PLAYER_PLAYBACK_RATE_MIN,
	} from '$lib/stores/player/player.svelte.ts'
	import { getLocale, type Locale, setLocale } from '$paraglide/runtime.js'
	import DirectoriesList from './components/DirectoriesList.svelte'
	import InstallAppBanner from './components/InstallAppBanner.svelte'
	import MissingFsApiBanner from './components/MissingFsApiBanner.svelte'

	const { data } = $props()

	// svelte-ignore state_referenced_locally
	initPageQueries(data)

	const mainStore = useMainStore()
	const player = usePlayer()
	const dialogs = useDialogsStore()

	const directories = $derived(data.directoriesQuery.value)

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

	const languageOptions: { name: string; value: Locale }[] = [
		{ name: 'English (EN)', value: 'en' },
		{ name: 'Lietuvių (LT)', value: 'lt' },
		{ name: 'Deutsch (DE)', value: 'de' },
		{ name: 'Français (FR)', value: 'fr' },
		{ name: '简体中文', value: 'zh-CN' },
		{ name: '繁體中文', value: 'zh-TW' },
	]

	const updateMainColor = debounce((value: string | null) => {
		mainStore.customThemePaletteHex = value
	}, 400)

	// We debounce state updates, because some DB operations can be very fast.
	// This prevents UI from flickering
	const isDatabasePendingGetter = new Debounced(() => isDatabaseOperationPending(), 200)
	const isDatabasePending = $derived(isDatabasePendingGetter.current)
</script>

{#snippet heading(text: string)}
	<div class="px-4 pt-4 text-title-sm text-onSurfaceVariant">{text}</div>
{/snippet}

<section class="card settings-max-width mx-auto w-full overflow-clip">
	<div class="flex flex-col p-4">
		<div class="flex items-center gap-2 text-title-sm">
			{m.settingsDirectories()}
		</div>
		<div class="mt-1 mb-4 text-body-sm text-onSurfaceVariant">
			{m.settingsAllDataLocal()}
		</div>

		{#if !isFileSystemAccessSupported}
			<MissingFsApiBanner />
		{/if}
		<DirectoriesList disabled={isDatabasePending} {directories} />

		{#if isDatabasePending}
			<div
				class="mt-4 flex w-full items-center justify-center gap-4 rounded-md bg-tertiaryContainer/20 py-4"
			>
				{m.settingsDbOperationInProgress()}
				<Spinner class="size-8" />
			</div>
		{/if}
	</div>
</section>

<InstallAppBanner class="settings-max-width mt-6" />

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	{@render heading(m.settingsAppearance())}

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsApplicationTheme()}</div>

		<Select
			bind:selected={mainStore.theme}
			items={themeOptions}
			key="value"
			labelKey="name"
			class="w-40"
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
					class="pointer-events-none absolute inset-0 size-full appearance-none opacity-0"
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
			class="w-40"
		/>
	</div>
</section>

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	{@render heading(m.player())}

	{#if supportsChangingAudioVolume()}
		<div class="flex items-center justify-between p-4">
			<div>{m.settingsDisplayVolumeSlider()}</div>

			<Switch bind:checked={mainStore.volumeSliderEnabled} />
		</div>

		<Separator />
	{/if}

	<div class="flex flex-col justify-between gap-y-4 p-4 sm:flex-row sm:items-center">
		<div class="flex items-center gap-2">
			<div>{m.equalizerTitle()}</div>

			{#if player.equalizer.enabled}
				<div
					class="rounded-full bg-primaryContainer px-2 py-0.5 text-label-sm text-onPrimaryContainer"
				>
					{m.equalizerStatusEnabled()}
				</div>
			{/if}
		</div>

		<Button
			kind="toned"
			onclick={() => {
				dialogs.equalizerDialogOpen = true
			}}
		>
			{m.equalizerOpenEqualizer()}
		</Button>
	</div>

	<Separator />

	<div class="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
		<div>{m.settingsPlaybackSpeed()}</div>

		<div class="flex w-full items-center gap-3 sm:w-56">
			<div class="w-12 text-center text-label-lg tabular-nums sm:text-right">
				{player.playbackRate}x
			</div>

			<Slider
				min={PLAYER_PLAYBACK_RATE_MIN}
				max={PLAYER_PLAYBACK_RATE_MAX}
				step={0.05}
				bind:value={player.playbackRate}
			/>
		</div>
	</div>

	<div class="flex justify-end px-4 pb-4">
		<Button
			kind="outlined"
			disabled={player.playbackRate === 1}
			onclick={() => {
				player.playbackRate = 1
			}}
		>
			{m.settingsPlaybackSpeedReset()}
		</Button>
	</div>

	<Separator />

	<div class="flex items-center justify-between p-4">
		<div class="flex items-center gap-2">
			<div>{m.settingsPreservePitch()}</div>

			<button
				type="button"
				class="interactable flex size-6 items-center justify-center rounded-full text-onSurfaceVariant"
				{@attach tooltip(m.settingsPreservePitchInfo())}
			>
				<Icon type="information" class="size-4" />
			</button>
		</div>

		<Switch bind:checked={player.preservePitch} />
	</div>
</section>

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	<div class="flex items-center justify-between p-4">
		<div>{m.settingsLanguage()}</div>

		<Select
			bind:selected={() => getLocale(), setLocale}
			items={languageOptions}
			key="value"
			labelKey="name"
			class="w-40"
		/>
	</div>
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
