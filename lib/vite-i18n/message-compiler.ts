import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { CONTENT_BANNER, MESSAGES_MODULE_ID } from './constants.ts'
import { assertValidTranslation, readJsonFile } from './utils.ts'

const PLACEHOLDER_REGEX = /\{(.*?)\}/g
const TYPES_PLACEHOLDER_REGEX = /(?<=\{)(.*?)(?=\})/g

interface MessageCompilerOptions {
	baseLocale: string
	inputDir: string
	outputDir: string
}

interface EmitResult {
	inputFilePath: string
	outputFilePath: string
	content: string
}

export class MessageCompiler {
	#baseLocale: string
	#inputDir: string
	#outputDir: string

	#baseLocaleJson: Record<string, string> | null = null

	constructor(options: MessageCompilerOptions) {
		this.#baseLocale = options.baseLocale
		this.#inputDir = options.inputDir
		this.#outputDir = options.outputDir
	}

	#resolveInputPath(locale: string): string {
		return path.resolve(this.#inputDir, `${locale}.json`)
	}

	async #getBaseLocaleJson(force = false) {
		if (this.#baseLocaleJson === null || force) {
			const baseLocaleInputPath = this.#resolveInputPath(this.#baseLocale)
			const json = await readJsonFile(baseLocaleInputPath)
			this.#baseLocaleJson = json
		}

		return this.#baseLocaleJson
	}

	#compileTranslationValueTemplate(input: string, hasPlaceholders: boolean): string {
		if (hasPlaceholders) {
			// Replace {placeholder} with ${p.placeholder}
			// biome-ignore lint/suspicious/noTemplateCurlyInString: template string
			const template = input.replace(PLACEHOLDER_REGEX, '${p.$1}')

			return `\`${template}\``
		}

		return `\`${input}\``
	}

	#compileTranslationValue(input: string) {
		const hasPlaceholders = PLACEHOLDER_REGEX.test(input)

		if (hasPlaceholders) {
			const template = this.#compileTranslationValueTemplate(input, true)

			return `(p) => ${template}`
		}

		return `() => \`${input}\``
	}

	async emit(locale: string, force = false): Promise<EmitResult> {
		const inputFilePath = this.#resolveInputPath(locale)
		const outputFilePath = path.resolve(this.#outputDir, `${locale}.js`)

		const isCompilingBaseLocale = locale === this.#baseLocale

		const [baseLocaleJson, json] = await Promise.all([
			this.#getBaseLocaleJson(isCompilingBaseLocale && force),
			locale === this.#baseLocale
				? null
				: readJsonFile(inputFilePath, { crashIfNotFound: false }),
		])

		const mergedJson = json
			? {
					...baseLocaleJson,
					...json,
				}
			: baseLocaleJson

		let content = CONTENT_BANNER
		let typesContent = isCompilingBaseLocale
			? `${CONTENT_BANNER}declare module ${JSON.stringify(MESSAGES_MODULE_ID)} {\n`
			: null

		const indentation = '\t'
		for (const [key, value] of Object.entries(mergedJson)) {
			assertValidTranslation(key, value, this.#resolveInputPath(locale))

			content += `export const ${key} = ${this.#compileTranslationValue(value)}\n`

			if (typesContent) {
				const params = [...value.matchAll(TYPES_PLACEHOLDER_REGEX)]

				let paramsString = ''
				if (params.length > 0) {
					const paramsTypes = params
						.map(([name]) => `${name}: string | number`)
						.join('; ')
					paramsString = `p: { ${paramsTypes} }`
				}

				typesContent += `${indentation}/** ${value} @public */\n${indentation}export const ${key}: (${paramsString}) => string\n`
			}
		}

		if (typesContent) {
			typesContent += '}\n'
		}

		await Promise.all([
			fs.writeFile(outputFilePath, content),
			typesContent && fs.writeFile(path.join(this.#outputDir, 'messages.d.ts'), typesContent),
		])

		return { inputFilePath, outputFilePath, content }
	}
}
