import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import '../app.css'
import type { LayoutLoad } from './$types.ts'

export const ssr = false

export const load: LayoutLoad = () => ({
	isHandHeldDevice: isMobile(),
})
