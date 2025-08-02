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
			const dirSize = async (directory: string): Promise<{ size: number; count: number }> => {
				let size = 0
				let count = 0

				const processDirectory = async (dir: string) => {
					const files = readdirSync(dir)

					for (const file of files) {
						const filePath = path.join(dir, file)
						const stat = statSync(filePath)

						if (stat.isDirectory()) {
							await processDirectory(filePath)
						} else {
							size += stat.size
							count += 1
						}
					}
				}

				await processDirectory(directory)
				return { size, count }
			}

			setTimeout(async () => {
				const { size, count } = await dirSize('./build/_app/immutable')
				// biome-ignore lint/suspicious/noConsole: log
				console.log('Size of chunks:', size / 1024, 'KB. Files count:', count)
			}, 2000)
		},
	}
}
