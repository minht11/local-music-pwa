import { redirect } from '@sveltejs/kit'

export function load() {
	// Redirect directly to player on app load
	throw redirect(307, '/player')
}