<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import { trackEvent } from '$lib/helpers/analytics.ts'
	import { isMobile } from '$lib/helpers/utils/ua.ts'

	interface Props {
		class: ClassValue
	}

	const { class: className }: Props = $props()

	const main = useMainStore()
	const isHandHeldDevice = isMobile()

	const install = async (e: BeforeInstallPromptEvent) => {
		await e.prompt()

		trackEvent('click-settings-install-app')
	}

	const installEvent = $derived(main.appInstallPromptEvent)
</script>

{#if installEvent}
	<section
		class={[
			'card mx-auto w-full items-center justify-between gap-2 bg-primary/12 p-4 text-body-lg sm:flex-row',
			className,
		]}
	>
		<div>
			{m.settingsInstallAppExplanation({
				device: isHandHeldDevice ? m.settingsInstallAppHomeScreen() : m.settingsInstallAppDesktop(),
			})}
		</div>

		<Button class="w-full sm:w-35" onclick={() => install(installEvent)}>
			{m.settingsInstallAppHomeAction()}
		</Button>
	</section>
{/if}
