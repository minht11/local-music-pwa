import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { CONTENT_BANNER, MESSAGES_MODULE_ID } from './constants.ts'
import { assertValidTranslation, readJsonFile } from './utils.ts'

const PLACEHOLDER_REGEX = /\{(.*?)\}/g

interface MessageCompilerOptions {
	baseLocale: string
	inputDir: string
	outputDir: string
}

interface EmitResult {
	inputFilePath: string
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

	#compileTranslationValue(input: string) {
		// {placeholder} -> ${p.placeholder}
		// biome-ignore lint/suspicious/noTemplateCurlyInString: building a template literal
		const template = input.replace(PLACEHOLDER_REGEX, '${p.$1}')
		const params = template === input ? '' : 'p'

		return `(${params}) => \`${template}\``
	}

	async emit(locale: string, force = false): Promise<EmitResult> {
		const inputFilePath = this.#resolveInputPath(locale)

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
				const uniqueParams = [
					...new Set([...value.matchAll(PLACEHOLDER_REGEX)].map((match) => match[1])),
				]

				let paramsString = ''
				if (uniqueParams.length > 0) {
					const paramsTypes = uniqueParams
						.map((name) => `${name}: string | number`)
						.join('; ')
					paramsString = `p: { ${paramsTypes} }`
				}

				typesContent += `${indentation}/** ${value} @public */\n${indentation}export const ${key}: (${paramsString}) => string\n`
			}
		}

		if (typesContent) {
			typesContent += '}\n'
		}

		// The compiled JS is served from memory by the plugin; only type declarations
		// are written to disk (TypeScript reads them from there).
		if (typesContent) {
			await fs.writeFile(path.join(this.#outputDir, 'messages.d.ts'), typesContent)
		}

		return { inputFilePath, content }
	}
}
