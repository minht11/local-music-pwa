import projectSettings from '../project.inlang/settings.json' with { type: 'json' }

type Messages = Record<string, string>

interface LocaleIssues {
	missingKeys: string[]
	paramMismatches: string[]
}

interface LocaleReport {
	locale: string
	issues: LocaleIssues
}

interface BaseMessageWithParams {
	value: string
	params: string[]
}

const extractParams = (value: string): string[] => {
	const paramsRegex = /{(\w+)}/g
	const params: string[] = []

	const matches = value.matchAll(paramsRegex)
	for (const match of matches) {
		params.push(match[1])
	}

	return params
}

const getMessages = async (locale: string): Promise<Messages> => {
	const module = (await import(`../messages/${locale}.json`, { with: { type: 'json' } })) as {
		default: Messages
	}

	delete module.default.$schema

	return module.default
}

const checkLocale = async (locale: string, baseMessagesMap: Map<string, BaseMessageWithParams>) => {
	const messages = await getMessages(locale)
	const issues: LocaleIssues = {
		missingKeys: [],
		paramMismatches: [],
	}

	for (const [key, baseData] of baseMessagesMap) {
		if (key in messages) {
			const localeParams = extractParams(messages[key])

			const missingParams = baseData.params.filter((param) => !localeParams.includes(param))
			const extraParams = localeParams.filter((param) => !baseData.params.includes(param))

			if (missingParams.length > 0) {
				issues.paramMismatches.push(key)
			} else if (extraParams.length > 0) {
				issues.paramMismatches.push(key)
			}
		} else {
			issues.missingKeys.push(key)
		}
	}

	return {
		locale,
		issues,
	}
}

const printReport = (reports: LocaleReport[]) => {
	let hasAnyIssues = false

	for (const report of reports) {
		const { locale, issues } = report

		if (issues.paramMismatches.length === 0 && issues.missingKeys.length === 0) {
			console.info(`✅ Locale "${locale}" has no issues`)
		} else {
			hasAnyIssues = true
		}

		if (issues.missingKeys.length > 0) {
			console.info(`❌ "${locale}" missing keys:`)
			console.info(issues.missingKeys)
		}

		if (issues.paramMismatches.length > 0) {
			console.info(`❌ "${locale}" has param mismatches in keys:`)
			console.info(issues.paramMismatches)
		}
	}

	if (hasAnyIssues) {
		process.exit(1)
	} else {
		process.exit(0)
	}
}

const baseMessages = await getMessages(projectSettings.baseLocale)
const baseMessagesMap = new Map<string, BaseMessageWithParams>()

for (const [key, value] of Object.entries(baseMessages)) {
	baseMessagesMap.set(key, {
		value,
		params: extractParams(value),
	})
}

const reports: LocaleReport[] = []

for (const locale of projectSettings.locales) {
	if (locale !== projectSettings.baseLocale) {
		const report = await checkLocale(locale, baseMessagesMap)
		reports.push(report)
	}
}

printReport(reports)
