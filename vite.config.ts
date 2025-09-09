import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'
import { logChunkSizePlugin } from './lib/vite-log-chunk-size.ts'
import { themeColorsPlugin } from './lib/vite-plugin-theme-colors.ts'

const getAutoImportPlugin = () =>
	AutoImport({
		dts: './.generated/types/auto-imports.d.ts',
		imports: [
			{
				'$paraglide/messages': [['*', 'm']],
				'$lib/stores/player/use-store.ts': ['usePlayer'],
				'$lib/stores/main/use-store.ts': ['useMainStore'],
				'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
				'tiny-invariant': [['default', 'invariant']],
				svelte: ['untrack'],
			},
		],
	})

export default defineConfig({
	server: {
		fs: {
			allow: ['./.generated'],
		},
		warmup: {
			// Avoids page reloading in Dev mode. When vite supports bundled-dev mode this can be removed.
			clientFiles: [
				'src/lib/components/**/*.svelte',
				'src/lib/library/scan-actions/scanner/worker.ts',
			],
		},
	},
	// Tell Vitest to use the `browser` entry points in `package.json` files, even though it's running in Node
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	build: {
		modulePreload: {
			polyfill: false,
		},
		rolldownOptions: {
			output: {
				legalComments: 'none',
				minify: {
					mangle: true,
					compress: true,
					codegen: {
						removeWhitespace: true,
					}
				},
				advancedChunks: {
					groups: [
						{
							// Merge all css into a single file
							name: 'styles',
							test: /\.css$/,
							minModuleSize: 0,
							priority: 100,
						},
						{
							// Merge smaller chunks than together
							name: 'small-chunks',
							maxModuleSize: 1 * 1024,
						},
					],
				},
			},
		},
		minify: 'terser',
		terserOptions: {
			module: true,
			compress: {
				passes: 3,
			},
		},
	},
	worker: {
		format: 'es',
		plugins: () => [getAutoImportPlugin()],
	},
	plugins: [
		themeColorsPlugin({
			defaultColorSeed: '#cc9724',
			output: `${import.meta.dirname}/.generated/theme-colors.css`,
		}),
		imagetools(),
		tailwindcss(),
		sveltekit(),
		getAutoImportPlugin(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './.generated/paraglide',
			strategy: ['baseLocale'],
			isServer: 'import.meta.env.SSR',
		}),
		logChunkSizePlugin(),
		{
			name: 'ssr-config',
			config(config) {
				const isSsr = config?.build?.ssr

				// Since this is mostly SPA, server logs are mostly noise.
				config.logLevel = isSsr ? 'warn' : 'info'

				return config
			},
		},
	],
})
