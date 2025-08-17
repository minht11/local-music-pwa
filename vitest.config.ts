import { defineConfig, mergeConfig, defaultExclude } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			exclude: [...defaultExclude, '.generated/**', 'build/**'],
			coverage: {
				include: ['src/'],
			},
		},
	}),
)
