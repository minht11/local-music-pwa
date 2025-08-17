import { isMobile, isSafari } from './utils/ua.ts'

/**
 * Safari mobile does not allow changing audio volume
 * @public
 */
export const supportsChangingAudioVolume = () => {
	if (isMobile() && isSafari()) {
		return false
	}

	return true
}
