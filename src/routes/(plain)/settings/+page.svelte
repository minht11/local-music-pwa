<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import IconButton from '$lib/components/IconButton.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Select from '$lib/components/Select.svelte'
	import Separator from '$lib/components/Separator.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import WrapTranslation from '$lib/components/WrapTranslation.svelte'
	import { initPageQueries } from '$lib/db/query.svelte.ts'
	import { Debounced } from '$lib/helpers/debounced.svelte.ts'
	import { debounce } from '$lib/helpers/utils/debounce.ts'
	import type { AppMotionOption, AppThemeOption } from '$lib/stores/main/store.svelte.ts'
	import DirectoriesList from './components/DirectoriesList.svelte'
	import MissingFsApiBanner from './components/MissingFsApiBanner.svelte'
	import { isDatabaseOperationPending } from './tracks/lock-database.ts'

	const { data } = $props()

	initPageQueries(data)

	const mainStore = useMainStore()

	const count = $derived(data.countQuery.value)
	const directories = $derived(data.directoriesQuery.value)

	const isFileSystemAccessSupported = window.showDirectoryPicker !== undefined

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

	// We debounce state updates, because some DB operations can be very fast
	// and we don't want to show pending UI for a split second
	const isDatabasePendingGetter = new Debounced(() => isDatabaseOperationPending(), 150)
	const isDatabasePending = $derived(isDatabasePendingGetter.current)
</script>

<section class="card container-lg mx-auto w-full max-w-[var(--settings-max-width)]">
	<div class="px-4 pt-4">
		<div class="text-body-lg">
			<WrapTranslation messageFn={m.settingsCurrentTracksInLibrary}>
				{#snippet tracksCount()}
					<strong class="rounded-xl bg-tertiary px-2 text-onTertiary tabular-nums">
						{count}
					</strong>
				{/snippet}
			</WrapTranslation>
		</div>
		<div>{m.settingsAllDataLocal()}</div>
	</div>

	<Separator class="mt-4" />

	<div class="flex flex-col p-4">
		{#if !isFileSystemAccessSupported}
			<MissingFsApiBanner />

			<Button kind="toned" class="mt-4 sm:ml-auto">Import tracks</Button>
		{:else}
			<div class="mb-4 text-title-sm">Directories</div>

			<DirectoriesList disabled={isDatabasePending} {directories} />
		{/if}

		{#if isDatabasePending}
			<div
				class="mt-4 flex w-full items-center justify-center gap-4 rounded-md bg-tertiaryContainer/20 py-4"
			>
				Scan in progress
				<Spinner class="size-8" />
			</div>
		{/if}
	</div>
</section>

<section class="card mx-auto mt-6 w-full max-w-[var(--settings-max-width)] text-body-lg">
	<div class="px-4 pt-4 text-title-sm">{m.settingsAppearance()}</div>

	<div class="flex items-center justify-between p-4">
		<div>{m.settingsApplicationTheme()}</div>

		<Select
			bind:selected={mainStore.theme}
			items={themeOptions}
			key="value"
			labelKey="name"
			class="w-25"
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

			<Button kind="toned" class="max-sm:w-full">
				<Icon type="eyedropper" class="size-5" />

				{m.settingsColorPick()}

				<input
					type="color"
					bind:value={
						() => mainStore.customThemePaletteHex ?? '#000000', (value) => updateMainColor(value)
					}
					class="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
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
			class="w-25"
		/>
	</div>

	<Separator />

	<div class="flex items-center justify-between p-4">
		<div>
			{m.settingsDisplayVolumeSlider()}
		</div>

		<Switch bind:checked={mainStore.volumeSliderEnabled} />
	</div>
</section>

<section class="card mx-auto mt-6 w-full max-w-[var(--settings-max-width)] text-body-lg">
	<div class="flex items-center justify-between p-4">
		<div>{m.about()}</div>

		<IconButton as="a" href="/about" tooltip={m.about()} icon="chevronRight" />
	</div>
</section>

<style>
	@reference '../../../app.css';

	:root {
		--settings-max-width: --spacing(225);
	}
</style>
