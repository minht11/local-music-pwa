<script lang="ts">
	import { ripple } from '$lib/attachments/ripple'
	import Icon, { type IconType } from '$lib/components/icon/Icon.svelte'

	interface Links {
		icon: IconType
		title: string
		href: string
	}

	const links: Links[] = [
		{
			title: m.aboutSourceCode(),
			href: 'https://github.com/minht11/local-music-pwa',
			icon: 'github',
		},
		{
			title: m.aboutPrivacy(),
			href: 'https://github.com/minht11/local-music-pwa#privacy',
			icon: 'lockCheck',
		},
		{
			title: m.aboutJoinDiscord(),
			href: 'https://discord.gg/9z3BnHuXZb',
			icon: 'discord',
		},
		{
			title: m.aboutHomepage(),
			href: '/',
			icon: 'home',
		},
	]
</script>

<section class="m-auto flex w-full flex-col select-text sm:max-w-lg">
	<div class="mb-10 flex flex-col items-center gap-4 text-center text-headline-md">
		<img src="/icons/responsive.svg" class="size-16" alt="Logo" />
		{m.appName()}
	</div>

	<ul class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
		{#each links as link}
			<li>
				<a
					{@attach ripple()}
					href={link.href}
					class="relative flex w-full items-center gap-4 overflow-clip rounded-lg border border-primary/10 bg-surfaceContainerLowest p-4 transition-transform hover:-translate-y-1"
					target="_blank"
					rel="noopener"
				>
					<Icon type={link.icon} class="size-5" />
					{link.title}
					<Icon type="openInNew" class="ml-auto size-4 text-onSurfaceVariant" />
				</a>
			</li>
		{/each}
	</ul>
</section>
