<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
</script>

<div
	class="mb-4 flex flex-col gap-4 rounded-lg border border-outlineVariant p-4 text-onSurfaceVariant select-text"
>
	<Icon type="alertCircle" class="shrink-0" />

	<span>
		{m.settingsMissingFs1()}
		<a
			class="link inline"
			target="_blank"
			rel="noopener noreferrer"
			href="https://caniuse.com/?search=showDirectoryPicker"
		>
			{m.settingsMissingFs2()}
		</a>{m.settingsMissingFs3()}
		<strong>{m.settingsMissingFs4()}</strong>
		{m.settingsMissingFs5()}
	</span>
</div>
