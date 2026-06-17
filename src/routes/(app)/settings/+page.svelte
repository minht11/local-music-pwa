<script lang="ts">
	import { getLocale, type Locale, setLocale } from 'i18n:runtime'
	import { browser } from '$app/env'
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import PlainLayout from '$lib/components/PlainLayout.svelte'
	import Slider from '$lib/components/Slider.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import { isDatabaseOperationPending } from '$lib/db/lock-database.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { Debounced } from '$lib/helpers/debounced.svelte.ts'
	import { isFileSystemAccessSupported } from '$lib/helpers/file-system.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { AppMotionOption, AppThemeOption } from '$lib/stores/main/store.svelte.ts'
	import {
		PLAYER_PLAYBACK_RATE_MAX,
		PLAYER_PLAYBACK_RATE_MIN,
	} from '$lib/stores/player/player.svelte.ts'
	import DirectoriesList from './components/DirectoriesList.svelte'
	import InstallAppBanner from './components/InstallAppBanner.svelte'
	import MissingFsApiBanner from './components/MissingFsApiBanner.svelte'
	import SettingsListItem from './components/SettingsListItem.svelte'
	import SettingsSelectListItem from './components/SettingsSelectListItem.svelte'
	import SettingsSwitchListItem from './components/SettingsSwitchListItem.svelte'

	const { data } = $props()

	initPageQueries(() => data)

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
		{ name: 'EN English', value: 'en' },
		{ name: 'LT Lietuvių', value: 'lt' },
		{ name: 'DE Deutsch', value: 'de' },
		{ name: 'FR Français', value: 'fr' },
		{ name: 'ES Español', value: 'es' },
		{ name: 'HI हिन्दी', value: 'hi' },
		{ name: 'JA 日本語', value: 'ja' },
		{ name: 'ZH-CN 简体中文', value: 'zh-CN' },
		{ name: 'ZH-TW 繁體中文', value: 'zh-TW' },
	]

	const updateMainColor = debounce((value: string | null) => {
		mainStore.customThemePaletteHex = value
	}, 400)

	// We debounce state updates, because some DB operations can be very fast.
	// This prevents UI from flickering
	const isDatabasePendingGetter = new Debounced(() => isDatabaseOperationPending(), 200)
	const isDatabasePending = $derived(isDatabasePendingGetter.current)

	const isGaplessPlaybackSupported = browser && 'AudioDecoder' in globalThis
</script>

{#snippet heading(text: string)}
	<div class="px-4 pt-4 text-title-sm text-onSurfaceVariant">{text}</div>
{/snippet}

<PlainLayout title={m.settings()}>
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
		<SettingsSelectListItem
			title={m.settingsApplicationTheme()}
			bind:selected={mainStore.theme}
			items={themeOptions}
		/>

		<SettingsSwitchListItem
			title={m.settingPickColorFromArtwork()}
			bind:checked={mainStore.pickColorFromArtwork}
		/>

		<SettingsListItem title={m.settingsPrimaryColor()} columnInCompactLayout bottomDivider>
			{#snippet afterTitle()}
				{#if mainStore.customThemePaletteHex}
					<div
						class="pointer-events-none size-6 shrink-0 items-center justify-center rounded-md ring ring-outline/40"
						style:background={mainStore.customThemePaletteHex}
					></div>
				{/if}
			{/snippet}

			<div class="flex items-center gap-2">
				<IconButton
					icon="restore"
					tooltip={m.settingsColorReset()}
					disabled={!mainStore.customThemePaletteHex}
					onclick={() => {
						mainStore.customThemePaletteHex = null
					}}
				/>

				<Button
					kind="toned"
					class="w-full sm:w-40"
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
		</SettingsListItem>

		<SettingsSelectListItem
			title={m.settingsMotion()}
			bind:selected={mainStore.motion}
			items={motionOptions}
		/>
	</section>

	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		{@render heading(m.player())}

		<SettingsListItem title={m.equalizerTitle()} columnInCompactLayout bottomDivider>
			{#snippet afterTitle()}
				{#if player.equalizer.enabled}
					<div
						class="rounded-full bg-primaryContainer px-2 py-0.5 text-label-sm text-onPrimaryContainer"
					>
						{m.equalizerStatusEnabled()}
					</div>
				{/if}
			{/snippet}

			<Button
				kind="toned"
				class="w-full sm:w-40"
				onclick={() => {
					dialogs.openDialog('equalizer')
				}}
			>
				{m.equalizerOpenEqualizer()}
			</Button>
		</SettingsListItem>

		{#if isGaplessPlaybackSupported}
			<SettingsSwitchListItem
				title={m.settingsGaplessPlayback()}
				description={m.settingsGaplessPlaybackDescription()}
				tooltip={m.settingsGaplessPlaybackInfo()}
				bind:checked={player.gaplessPlaybackEnabled}
				bottomDivider
			/>
		{/if}

		<SettingsListItem title={`${m.settingsPlaybackSpeed()}`} columnInCompactLayout>
			{#snippet afterTitle()}
				<span class="text-onSurfaceVariant">
					{player.playbackRate}x
				</span>
			{/snippet}
			<div class="flex items-center gap-2">
				<IconButton
					icon="restore"
					tooltip={m.settingsPlaybackSpeedReset()}
					disabled={player.playbackRate === 1}
					onclick={() => {
						player.playbackRate = 1
					}}
				/>
				<div class="w-full sm:w-40">
					<Slider
						min={PLAYER_PLAYBACK_RATE_MIN}
						max={PLAYER_PLAYBACK_RATE_MAX}
						step={0.05}
						bind:value={player.playbackRate}
					/>
				</div>
			</div>
		</SettingsListItem>

		<SettingsSwitchListItem
			title={m.settingsPreservePitch()}
			description={player.gaplessPlaybackEnabled
				? m.settingsPreservePitchGaplessDescription()
				: m.settingsPreservePitchDescription()}
			disabled={player.gaplessPlaybackEnabled}
			bind:checked={player.preservePitch}
			bottomDivider
		/>

		<SettingsSwitchListItem
			title={m.settingsDisplayVolumeSlider()}
			bind:checked={mainStore.volumeSliderEnabled}
			bottomDivider
		/>

		<SettingsSwitchListItem
			title={m.settingsPauseAfterEachTrack()}
			description={m.settingsPauseAfterEachTrackDescription()}
			bind:checked={player.pauseAfterTrackWhenRepeatIsOff}
		/>
	</section>

	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		<SettingsSelectListItem
			title={m.settingsLanguage()}
			bind:selected={() => getLocale(), setLocale}
			items={languageOptions}
		/>
	</section>

	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		<SettingsListItem title={m.settingsAbout()}>
			<IconButton as="a" href="/about" tooltip={m.about()} icon="chevronRight" />
		</SettingsListItem>
	</section>
</PlainLayout>

<style lang="postcss">
	@reference '../../../app.css';

	:global(.settings-max-width) {
		max-width: --spacing(225);
	}
</style>
