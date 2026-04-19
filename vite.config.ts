import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import { imageMetadataPlugin } from './lib/vite-image-metadata.ts'
import { logChunkSizePlugin } from './lib/vite-log-chunk-size.ts'

const getAutoImportPlugin = (dts: string | false = false) =>
	AutoImport({
		dts,
		imports: [
			{
				'$paraglide/messages': [['*', 'm']],
				'$lib/stores/player/use-store.ts': ['usePlayer'],
				'$lib/stores/main/use-store.ts': ['useMainStore'],
				'$lib/stores/dialogs/use-store.ts': ['useDialogsStore'],
				'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
				'$lib/components/snackbar/snackbar.ts': ['snackbar'],
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
		target: ['chrome130', 'safari18'],
		rolldownOptions: {
			output: {
				comments: false,
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
	},
	worker: {
		format: 'es',
		plugins: () => [getAutoImportPlugin()],
	},
	plugins: [
		imageMetadataPlugin(),
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './.generated/paraglide',
			strategy: ['baseLocale'],
			isServer: 'import.meta.env.SSR',
		}),
		getAutoImportPlugin('./.generated/types/auto-imports.d.ts'),
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
