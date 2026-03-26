<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Select from '$lib/components/Select.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import { snackbar } from '$lib/components/snackbar/snackbar.ts'
	import { isDatabaseOperationPending } from '$lib/db/lock-database.ts'
	import { initPageQueries } from '$lib/db/query/page-query.svelte.ts'
	import { supportsChangingAudioVolume } from '$lib/helpers/audio.ts'
	import { Debounced } from '$lib/helpers/debounced.svelte.ts'
	import { isFileSystemAccessSupported } from '$lib/helpers/file-system.ts'
	import { forceServiceWorkerUpdate } from '$lib/helpers/register-sw.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import { navigateToExternal } from '$lib/helpers/utils/navigate.ts'
	import { isRajneeshEnabled } from '$lib/rajneesh/feature-flags.ts'
	import { getCatalog, refreshRajneeshCatalog } from '$lib/rajneesh/index.ts'
	import type { AppMotionOption, AppThemeOption } from '$lib/stores/main/store.svelte.ts'
	import { getLocale, type Locale, setLocale } from '$paraglide/runtime.js'
	import DirectoriesList from './components/DirectoriesList.svelte'
	import InstallAppBanner from './components/InstallAppBanner.svelte'
	import MissingFsApiBanner from './components/MissingFsApiBanner.svelte'

	const { data } = $props()

	// svelte-ignore state_referenced_locally
	initPageQueries(data)

	const mainStore = useMainStore()

	const directories = $derived(data.directoriesQuery.value)
	const listenedMinutes = $derived(data.listenedMinutesQuery.value ?? 0)
	const completedTracks = $derived(data.completedTracksQuery.value ?? 0)
	const totalTracks = $derived(data.totalTracksQuery.value ?? 0)

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
	]

	const updateMainColor = debounce((value: string | null) => {
		mainStore.customThemePaletteHex = value
	}, 400)

	// We debounce state updates, because some DB operations can be very fast.
	// This prevents UI from flickering
	const isDatabasePendingGetter = new Debounced(() => isDatabaseOperationPending(), 200)
	const isDatabasePending = $derived(isDatabasePendingGetter.current)

	const directContactLink = $derived.by(() => getCatalog()?.directContactLink)
	let isUpdateRefreshPending = $state(false)

	const listeningStatLabel = $derived.by(() => {
		if (listenedMinutes < 60) {
			return m.settingsStatsListeningMinutes({ minutes: listenedMinutes })
		}

		return m.settingsStatsListeningHours({ hours: Math.floor(listenedMinutes / 60) })
	})

	const refreshUpdates = async () => {
		if (isUpdateRefreshPending) return

		isUpdateRefreshPending = true

		try {
			const catalogRefreshed = await refreshRajneeshCatalog()
			const appUpdateApplied = await forceServiceWorkerUpdate()

			if (appUpdateApplied) {
				snackbar({
					id: 'settings-force-update',
					message: m.settingsUpdatesReloading(),
					duration: false,
					controls: false,
				})
				return
			}

			snackbar({
				id: 'settings-force-update',
				message: catalogRefreshed
					? m.settingsUpdatesCatalogRefreshed()
					: m.settingsUpdatesNoChanges(),
			})
		} catch (error) {
			snackbar.unexpectedError(error)
		} finally {
			isUpdateRefreshPending = false
		}
	}
</script>

{#if !isRajneeshEnabled()}
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
{/if}

<InstallAppBanner class="settings-max-width mt-6" />

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	<div class="px-4 pt-4 text-title-sm">{m.settingsUpdatesTitle()}</div>
	<div class="flex items-center justify-between gap-4 p-4 max-sm:flex-col max-sm:items-start">
		<div class="text-body-md text-onSurfaceVariant">
			{m.settingsUpdatesSubtitle()}
		</div>
		<Button
			kind="outlined"
			disabled={isUpdateRefreshPending}
			onclick={() => {
				void refreshUpdates()
			}}
		>
			{#if isUpdateRefreshPending}
				<Spinner class="size-5" />
			{/if}
			{isUpdateRefreshPending ? m.settingsUpdatesChecking() : m.settingsUpdatesRefreshNow()}
		</Button>
	</div>
</section>

<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
	<div class="px-4 pt-4 text-title-sm">{m.settingsStatsTitle()}</div>
	<div class="flex flex-col gap-2 p-4 text-body-md">
		<div>{listeningStatLabel}</div>
		<div>
			{m.settingsStatsCompletedTracks({ completed: completedTracks, total: totalTracks })}
		</div>
	</div>
</section>

{#if directContactLink}
	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		<div class="px-4 pt-4 text-title-sm">{m.settingsIssueTitle()}</div>
		<div class="flex items-center justify-between p-4">
			<div class="text-body-md text-onSurfaceVariant">
				{m.settingsIssueSubtitle()}
			</div>
			<Button
				kind="outlined"
				onclick={() => {
					navigateToExternal(directContactLink)
				}}
			>
				{m.settingsIssueCta()}
			</Button>
		</div>
	</section>
{/if}

{#if isRajneeshEnabled()}
	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		<div class="px-4 pt-4 text-title-sm">Content</div>
		<div class="flex items-center justify-between p-4">
			<div class="flex flex-col">
				<div>Hindi only</div>
				<div class="text-body-sm text-onSurfaceVariant">
					Hide English discourses
				</div>
			</div>

			<Switch bind:checked={mainStore.hindiOnly} />
		</div>
	</section>
{/if}

{#if !isRajneeshEnabled()}
	<section class="card settings-max-width mx-auto mt-6 w-full text-body-lg">
		<div class="px-4 pt-4 text-title-sm">{m.settingsAppearance()}</div>

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
				class="w-40"
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
{/if}

<style lang="postcss">
	@reference '../../../../app.css';

	:global(.settings-max-width) {
		max-width: --spacing(225);
	}
</style>
