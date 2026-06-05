import { defineEnvVars } from '@sveltejs/kit/hooks'

const schemaValidator = <Input, Output = Input>(
	validator: (value: unknown) => { value: Output } | { issues: { message: string }[] },
) =>
	({
		'~standard': {
			version: 1,
			vendor: 'snae',
			validate: validator,
			types: {
				input: 1 as unknown as Input,
				output: 1 as unknown as Output,
			},
		},
	}) as const

export const variables = defineEnvVars({
	PUBLIC_FALLBACK_PAGE: {
		public: true,
		static: true,
		schema: schemaValidator<string>((value) => {
			if (typeof value === 'string' && value.startsWith('/') && value.endsWith('.html')) {
				return { value }
			}

			return {
				issues: [{ message: 'Expected string starting with "/" and ending with ".html"' }],
			}
		}),
	},
	PUBLIC_GOAT_COUNTER_URL: {
		public: true,
		static: true,
		schema: schemaValidator<string | undefined>((value) => {
			if (typeof value === 'string' || value === undefined) {
				return { value }
			}

			return { issues: [{ message: 'Expected string or undefined' }] }
		}),
	},
})
