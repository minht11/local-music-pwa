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
	build: {
		target: 'esnext',
		cssCodeSplit: false,
		minify: 'terser',
		terserOptions: {
			output: {
				comments: false,
			},
			module: true,
			compress: {
				passes: 3,
				unsafe_math: true,
				unsafe_methods: true,
				unsafe_arrows: true,
			},
			// mangle: {
			// 	properties: {
			// 		regex: /^_/,
			// 	},
			// },
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
				{
					'$paraglide/messages': [['*', 'm']],
				},
			],
		}),
		paraglide({
			project: './project.inlang',
			outdir: './.generated/paraglide',
		}),
	],
})
