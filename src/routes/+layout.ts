import { isMobile } from '$lib/helpers/utils'
import '@unocss/reset/tailwind.css'
import '../app.css'
import type { LayoutLoad } from './$types'

export const ssr = false

export const load: LayoutLoad = (event) => {
	return {
		pathname: event.url.pathname,
		title: '',
		isHandHeldDevice: isMobile(),
	}
}
