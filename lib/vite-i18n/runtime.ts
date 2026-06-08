import fs from 'node:fs/promises'
import path from 'node:path'
import { CONTENT_BANNER } from './constants.ts'

interface EmitRuntimeModuleOptions {
	outputDir: string
	baseLocale: string
	locales: string[]
	localStorageKey: string
}

export const emitRuntimeModule = async (options: EmitRuntimeModuleOptions) => {
	const { baseLocale, locales } = options

	const lines = [
		CONTENT_BANNER,
		`/** @public */ export type Locale = ${locales.map((locale) => `'${locale}'`).join(' | ')};`,
		`/** @public */ export type BaseLocale = '${baseLocale}';`,
		`/** @public */ export const BASE_LOCALE: BaseLocale = '${baseLocale}';`,
		`/** @public */ export const LOCALES: Locale[] = [${locales.map((locale) => `'${locale}'`).join(', ')}];`,
		`/** @public */ const LOCAL_STORAGE_KEY = '${options.localStorageKey}';`,
		'/** @public */ const isLocale = (locale: unknown): locale is Locale => LOCALES.includes(locale as Locale);',
		`/** @public */ export const setLocale = (locale: Locale) => {
			if (isLocale(locale)) {
				localStorage.setItem(LOCAL_STORAGE_KEY, locale);
				window.location.reload();
			}
		};`,
		`/** @public */ export const getLocale = (): Locale => {
			const locale = localStorage.getItem(LOCAL_STORAGE_KEY);
			return isLocale(locale) ? locale : BASE_LOCALE;
		}`,
	]

	await fs.writeFile(path.resolve(options.outputDir, 'runtime.ts'), lines.join('\n'))
}
