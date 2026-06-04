import { readFile } from 'node:fs/promises'

export interface LoadJsonOptions<CrashIfNotFound extends boolean = true> {
	crashIfNotFound: CrashIfNotFound
}

type JsonFileResult<CrashIfNotFound extends boolean> = CrashIfNotFound extends true
	? Record<string, string>
	: Record<string, string> | null

export const readJsonFile = async <CrashIfNotFound extends boolean = true>(
	source: string,
	options: LoadJsonOptions<CrashIfNotFound> = {
		crashIfNotFound: true,
	} as LoadJsonOptions<CrashIfNotFound>,
): Promise<JsonFileResult<CrashIfNotFound>> => {
	let content: string
	try {
		content = await readFile(source, { encoding: 'utf8' })
	} catch (error) {
		if (
			!options.crashIfNotFound &&
			error instanceof Error &&
			(error as NodeJS.ErrnoException).code === 'ENOENT'
		) {
			return null as JsonFileResult<CrashIfNotFound>
		}

		throw error
	}

	const json = JSON.parse(content)

	delete json.$schema

	return json
}

const validKeyRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

export function assertValidTranslation(
	key: string,
	value: unknown,
	filename: string,
): asserts value is string {
	if (typeof value !== 'string') {
		throw new Error(
			`Invalid translation value in file "${filename}": expected string for key "${key}", but got ${typeof value}.`,
		)
	}

	if (!validKeyRegex.test(key)) {
		throw new Error(
			`Invalid translation key in file "${filename}": "${key}" is not a valid identifier. Keys can only contain alphanumeric characters, underscores, and dollar signs, and must start with a letter or underscore.`,
		)
	}
}
