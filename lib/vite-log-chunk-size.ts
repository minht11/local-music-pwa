import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/** @public */
export const logChunkSizePlugin = (): Plugin => {
	return {
		name: logChunkSizePlugin.name,
		apply: 'build',
		enforce: 'post',
		writeBundle() {
			if (this.environment.name === 'ssr') {
				return
			}

			const dirSize = async (directory: string) => {
				const jsInfo = { size: 0, count: 0 }
				const totalInfo = { size: 0, count: 0 }

				const processDirectory = async (dir: string) => {
					const files = readdirSync(dir)

					for (const file of files) {
						const filePath = path.join(dir, file)
						const stat = statSync(filePath)

						if (stat.isDirectory()) {
							await processDirectory(filePath)
						} else {
							if (file.endsWith('.js')) {
								jsInfo.size += stat.size
								jsInfo.count += 1
							}
							totalInfo.size += stat.size
							totalInfo.count += 1
						}
					}
				}

				await processDirectory(directory)

				return { jsInfo, totalInfo }
			}

			setTimeout(async () => {
				const { jsInfo, totalInfo } = await dirSize('./build/_app/immutable')
				// biome-ignore lint/suspicious/noConsole: log
				console.log(
					'Size of JS chunks:',
					jsInfo.size / 1024,
					'KB. Files count:',
					jsInfo.count,
				)
				// biome-ignore lint/suspicious/noConsole: log
				console.log(
					'Size of all files:',
					totalInfo.size / 1024,
					'KB. Files count:',
					totalInfo.count,
				)
			}, 2000)
		},
	}
}
