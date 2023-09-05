import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import UnoCSS from '@unocss/svelte-scoped/vite'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
	plugins: [
		UnoCSS(),
		sveltekit(),
		AutoImport({
			imports: [
				{
					'$lib/helpers/clx.ts': ['clx'],
				},
			],
		}),
	],
})
