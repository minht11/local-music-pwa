<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
</script>

<div
	class="flex flex-col gap-4 rounded-lg border border-outlineVariant p-4 text-onSurfaceVariant select-text"
>
	<Icon type="alertCircle" class="shrink-0" />
	<span>
		Your browser currently does not support&nbsp
		<a
			class="link inline-block"
			target="_blank"
			rel="noopener noreferrer"
			href="https://wicg.github.io/file-system-access/"
		>
			required FS features
		</a>, so in order for this app to work,
		<strong>each music file must be copied and saved inside browser storage</strong>, that might
		consume a lot of your device's storage.
	</span>
</div>
