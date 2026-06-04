import { defineEnvVars } from '@sveltejs/kit/hooks'

const stringOrUndefinedSchema = {
	'~standard': {
		version: 1,
		vendor: 'snae',
		validate: (value: unknown) =>
			typeof value === 'string' || value === undefined
				? { value: value as string | undefined }
				: { issues: [{ message: 'Expected string or undefined' }] },
		types: {
			input: '' as string | undefined,
			output: '' as string | undefined,
		},
	},
} as const

export const variables = defineEnvVars({
	PUBLIC_FALLBACK_PAGE: {
		public: true,
		static: true,
	},
	PUBLIC_GOAT_COUNTER_URL: {
		public: true,
		static: true,
		schema: stringOrUndefinedSchema,
	},
})
