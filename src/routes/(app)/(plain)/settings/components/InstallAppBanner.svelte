<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import { isMobile } from '$lib/helpers/utils/is-mobile'

	interface Props {
		class: ClassValue
	}

	const { class: className }: Props = $props()

	const main = useMainStore()
	const isHandHeldDevice = isMobile()

	const install = async (e: BeforeInstallPromptEvent) => {
		await e.prompt()

		window.goatcounter?.count({
			path: 'click-settings-install-app',
			title: 'Clicked settings install app',
			event: true,
		})
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
