<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
</script>

<div
	class="flex flex-col gap-4 rounded-lg border border-outlineVariant p-4 text-onSurfaceVariant select-text"
>
	<Icon type="alertCircle" class="shrink-0" />
	<span>
		{m.settingsMissingFs1()}&nbsp
		<a
			class="link inline-block"
			target="_blank"
			rel="noopener noreferrer"
			href="https://wicg.github.io/file-system-access/"
		>
			{m.settingsMissingFs2()}
		</a>{m.settingsMissingFs3()}
		<strong>{m.settingsMissingFs4()}</strong>
		{m.settingsMissingFs5()}
	</span>
</div>
