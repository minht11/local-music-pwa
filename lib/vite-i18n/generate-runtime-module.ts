import { CONTENT_BANNER, RUNTIME_MODULE_ID } from './constants.ts'

export const generateRuntimeModuleDeclaration = (baseLocale: string, locales: string[]): string => {
	const lines = [
		CONTENT_BANNER,
		`declare module "${RUNTIME_MODULE_ID}" {`,
		`\texport type Locale = ${locales.map((locale) => `'${locale}'`).join(' | ')};`,
		`\texport type BaseLocale = '${baseLocale}';`,
		'\texport const BASE_LOCALE: BaseLocale;',
		'\texport const LOCALES: Locale[];',
		'\texport const IMPORT_MAP_LOADER_SCRIPT: string;',
		'\texport const setLocale: (locale: Locale) => void;',
		'\texport const getLocale: () => Locale;',
		'}',
	]

	return lines.join('\n')
}

interface GenerateGenerateContentsOptions {
	baseLocale: string
	locales: string[]
	importMapLoaderScript: string
	localStorageKey: string
}

export const generateRuntimeModule = (options: GenerateGenerateContentsOptions) => {
	const lines = [
		CONTENT_BANNER,
		`export const BASE_LOCALE = '${options.baseLocale}';`,
		`export const LOCALES = [${options.locales.map((locale) => `'${locale}'`).join(', ')}];`,
		`export const IMPORT_MAP_LOADER_SCRIPT = ${JSON.stringify(options.importMapLoaderScript)}`,
		`const LOCAL_STORAGE_KEY = '${options.localStorageKey}';`,
		'const isLocale = (locale) => LOCALES.includes(locale);',
		`export const setLocale = (locale) => {
			if (isLocale(locale)) {
				localStorage.setItem(LOCAL_STORAGE_KEY, locale);
				window.location.reload();
			}
		};`,
		`export const getLocale = () => {
			const locale = localStorage.getItem(LOCAL_STORAGE_KEY);
			return isLocale(locale) ? locale : BASE_LOCALE;
		}`,
	]

	return lines.join('\n')
}
