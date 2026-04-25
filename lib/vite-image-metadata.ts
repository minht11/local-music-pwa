import fs from 'node:fs'
import path from 'node:path'
import { imageSizeFromFile } from 'image-size/fromFile'
import type { Plugin } from 'vite'

const imageQuery = '?as=metadata'
const allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']

const queryRegex = /\?as=metadata$/

/** @public */
export function imageMetadataPlugin(): Plugin {
	return {
		name: 'vite-plugin-image-metadata',
		enforce: 'pre',
		load: {
			filter: {
				id: queryRegex,
			},
			async handler(id) {
				const filePath = id.replace(imageQuery, '')

				const ext = path.extname(filePath).slice(1)
				if (!allowedExts.includes(ext)) {
					return
				}

				if (!fs.existsSync(filePath)) {
					return
				}

				const dimensions = await imageSizeFromFile(filePath)

				return `
          import src from "${filePath}?url";

          export const width = ${dimensions.width};
          export const height = ${dimensions.height};
          export { src };

          export default { src, width, height };
        `
			},
		},
	}
}
