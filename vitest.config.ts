import { defaultExclude, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(async (configEnv) =>
	mergeConfig(
		await viteConfig(configEnv),
		defineConfig({
			test: {
				environment: 'happy-dom',
				exclude: [...defaultExclude, '.generated/**', 'build/**'],
			},
		}),
	),
)
