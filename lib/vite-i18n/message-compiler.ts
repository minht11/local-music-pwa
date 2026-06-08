import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import { CONTENT_BANNER, MESSAGES_MODULE_ID } from './constants.ts'
import { computeStableFileName } from './locale-modules.ts'
import { assertValidTranslation, readJsonFile } from './utils.ts'

const PLACEHOLDER_REGEX = /\{(.*?)\}/g

interface MessageCompilerOptions {
	baseLocale: string
	inputDir: string
	outputDir: string
	locales: string[]
}

interface CompiledLocale {
	/** Compiled message module source. */
	content: string
	/** Stable, content-hashed chunk file name. */
	fileName: string
}

export class MessageCompiler {
	#baseLocale: string
	#inputDir: string
	#outputDir: string
	#locales: string[]

	#baseLocaleJson: Record<string, string> | null = null

	#compiled = new Map<string, CompiledLocale>()

	constructor(options: MessageCompilerOptions) {
		this.#baseLocale = options.baseLocale
		this.#inputDir = options.inputDir
		this.#outputDir = options.outputDir
		this.#locales = options.locales
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
		// Escape backslash and backtick so they don't break the generated template
		// literal. Backslash first, so we don't double-escape the ones we add.
		const escaped = input.replace(/\\/g, '\\\\').replace(/`/g, '\\`')

		let hasParams = false
		// {placeholder} -> ${p.placeholder}
		const template = escaped.replace(PLACEHOLDER_REGEX, (_match, name) => {
			hasParams = true
			return `\${p.${name}}`
		})

		return `(${hasParams ? 'p' : ''}) => \`${template}\``
	}

	async generate(locale: string, force = false): Promise<CompiledLocale> {
		const inputFilePath = this.#resolveInputPath(locale)
		const isGenBaseLocale = locale === this.#baseLocale

		const [baseLocaleJson, json] = await Promise.all([
			this.#getBaseLocaleJson(isGenBaseLocale && force),
			isGenBaseLocale ? null : readJsonFile(inputFilePath, { crashIfNotFound: false }),
		])

		const mergedJson = json
			? {
					...baseLocaleJson,
					...json,
				}
			: baseLocaleJson

		let content = CONTENT_BANNER
		for (const [key, value] of Object.entries(mergedJson)) {
			assertValidTranslation(key, value, inputFilePath)

			content += `export const ${key} = ${this.#compileTranslationValue(value)}\n`
		}

		const compiled: CompiledLocale = {
			content,
			fileName: computeStableFileName(locale, content),
		}
		this.#compiled.set(locale, compiled)

		return compiled
	}

	async emitTypes() {
		const json = await this.#getBaseLocaleJson()

		let content = `${CONTENT_BANNER}declare module ${JSON.stringify(MESSAGES_MODULE_ID)} {\n`

		const indentation = '\t'
		for (const [key, value] of Object.entries(json)) {
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

			content += `${indentation}/** ${value} @public */\n`
			content += `${indentation}export const ${key}: (${paramsString}) => string\n`
		}

		content += '}\n'

		await fs.writeFile(path.join(this.#outputDir, 'messages.d.ts'), content)
	}

	async prepare(): Promise<void> {
		for (const locale of this.#locales) {
			await this.generate(locale)
		}
	}

	getContent(locale: string): string | undefined {
		return this.#compiled.get(locale)?.content
	}

	getFileName(locale: string): string {
		const compiled = this.#compiled.get(locale)
		invariant(compiled, `Locale "${locale}" has not been compiled`)

		return compiled.fileName
	}
}
