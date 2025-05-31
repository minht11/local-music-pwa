import { getAppIcon } from '../icon.server.ts'

export const prerender = true

export const GET = () => {
	const icon = getAppIcon()

	return new Response(icon, {
		headers: {
			'Content-Type': 'image/svg+xml',
		},
	})
}
