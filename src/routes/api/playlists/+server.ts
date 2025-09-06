import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Check if client wants to fetch from YTM directly
		const direct = url.searchParams.get('direct') === 'true'
		
		if (direct) {
			// This would require server-side YTM connection
			// For now, return error indicating client-side only
			return json(
				{ error: 'Direct YTM access not implemented on server-side. Use client-side store.' },
				{ status: 501 }
			)
		}
		
		// Return default/example playlists structure
		const playlists = [
			{
				id: 'LM',
				title: 'Liked Music',
				trackCount: 0,
				thumbnail: null,
				author: 'Your Library'
			},
			{
				id: 'example-playlist',
				title: 'My Playlist #1',
				trackCount: 25,
				thumbnail: null,
				author: 'You'
			}
		]
		
		return json({ 
			playlists,
			source: 'example-data',
			timestamp: new Date().toISOString()
		})
	} catch (error) {
		console.error('Error fetching playlists:', error)
		return json(
			{ error: 'Failed to fetch playlists' },
			{ status: 500 }
		)
	}
}