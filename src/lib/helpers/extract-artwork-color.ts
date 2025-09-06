import { getPrimaryColor } from '$lib/library/scan-actions/scanner/parse/image-primary-color.ts'

const CANVAS_SIZE = 100 // Small size for performance

// Cache to avoid re-extracting colors for the same image URLs
const colorCache = new Map<string, number | undefined>()

/**
 * Extract primary color from an image URL (for remote artwork like YTM thumbnails)
 */
export async function extractColorFromImageUrl(imageUrl: string): Promise<number | undefined> {
	if (!imageUrl) return undefined
	
	// Check cache first
	if (colorCache.has(imageUrl)) {
		return colorCache.get(imageUrl)
	}
	
	try {
		// Try with crossOrigin first, fallback without if CORS fails
		let img = new Image()
		let corsEnabled = true
		
		try {
			img.crossOrigin = 'anonymous'
			
			// Load the image
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Image load timeout'))
				}, 10000) // 10 second timeout
				
				img.onload = () => {
					clearTimeout(timeout)
					resolve()
				}
				img.onerror = () => {
					clearTimeout(timeout)
					reject(new Error('CORS image load failed'))
				}
				img.src = imageUrl
			})
		} catch (corsError) {
			// CORS failed, try without crossOrigin
			console.log('CORS failed, trying without crossOrigin for:', imageUrl)
			corsEnabled = false
			img = new Image()
			
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Image load timeout'))
				}, 10000)
				
				img.onload = () => {
					clearTimeout(timeout)
					resolve()
				}
				img.onerror = () => {
					clearTimeout(timeout)
					reject(new Error('Image load failed'))
				}
				img.src = imageUrl
			})
		}
		
		// Create canvas and draw image
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')
		if (!ctx) throw new Error('Could not get canvas context')
		
		// Calculate dimensions maintaining aspect ratio
		const aspectRatio = img.width / img.height
		let canvasWidth = CANVAS_SIZE
		let canvasHeight = CANVAS_SIZE
		
		if (aspectRatio > 1) {
			canvasHeight = CANVAS_SIZE / aspectRatio
		} else {
			canvasWidth = CANVAS_SIZE * aspectRatio
		}
		
		canvas.width = Math.floor(canvasWidth)
		canvas.height = Math.floor(canvasHeight)
		
		// Draw image and extract pixel data
		ctx.imageSmoothingEnabled = false
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
		
		let imageData: ImageData
		try {
			imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
		} catch (securityError) {
			// Canvas is tainted due to CORS, cannot extract pixel data
			console.warn('Canvas tainted, cannot extract color from:', imageUrl)
			colorCache.set(imageUrl, undefined)
			return undefined
		}
		
		const primaryColor = getPrimaryColor(imageData.data, canvas.width, canvas.height)
		
		// Cache the result
		colorCache.set(imageUrl, primaryColor)
		
		return primaryColor
	} catch (error) {
		console.warn('Failed to extract color from image:', imageUrl, error)
		// Cache undefined to avoid repeated attempts
		colorCache.set(imageUrl, undefined)
		return undefined
	}
}

/**
 * Clear the color extraction cache (useful when memory management is needed)
 */
export function clearColorCache(): void {
	colorCache.clear()
}