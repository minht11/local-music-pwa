import type { LayoutLoad } from './$types'
import '../app.css'

export const ssr = false

export const load: LayoutLoad = (event) => {
	return { pathname: event.url.pathname, title: '' }
}
