import { paraglide } from '@inlang/paraglide-js-adapter-vite'
import { sveltekit } from '@sveltejs/kit/vite'
import UnoCSS from '@unocss/svelte-scoped/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	server: {
		fs: {
			allow: ['./.generated'],
		},
	},
	plugins: [
		UnoCSS(),
		sveltekit(),
		AutoImport({
			dts: './.generated/types/auto-imports.d.ts',
			imports: [
				{
					'$lib/helpers/clx.ts': ['clx'],
				},
			],
		}),
		paraglide({
			project: './project.inlang',
			outdir: './.generated/paraglide',
		}),
	],
})
