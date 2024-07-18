import { paraglide } from '@inlang/paraglide-vite'
import { sveltekit } from '@sveltejs/kit/vite'
import UnoCSS from '@unocss/svelte-scoped/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	server: {
		fs: {
			allow: ['./.generated'],
		},
		warmup: {
			clientFiles: [
				'src/lib/components/**/*.svelte',
				'src/lib/library/import-tracks/importer.ts',
			],
		},
	},
	build: {
		modulePreload: {
			polyfill: false,
		},
		rollupOptions: {
			output: {
				// Some chunks will still be smaller than this
				// because of how svelte kit works.
				experimentalMinChunkSize: 20 * 1024, // 20kb
			},
		},
		target: 'esnext',
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
					from: 'svelte',
					imports: ['Snippet'],
					type: true,
				},
				{
					'$lib/helpers/clx.ts': ['clx'],
				},
				{
					'$paraglide/messages': [['*', 'm']],
				},
				{
					'$lib/stores/player/store': ['usePlayer'],
				},
				{
					'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
				},
			],
		}),
		paraglide({
			project: './project.inlang',
			outdir: './.generated/paraglide',
		}),
	],
})
