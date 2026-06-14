/**
 * SHA-256 hex digest of a blob's bytes.
 */
export const sha256Hex = async (blob: Blob): Promise<string> => {
	const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())

	let hex = ''
	for (const byte of new Uint8Array(digest)) {
		hex += byte.toString(16).padStart(2, '0')
	}

	return hex
}
