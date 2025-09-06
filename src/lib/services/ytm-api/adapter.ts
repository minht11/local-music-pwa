import type { YTMTrack, YTMPlaylist, YTMPlayerState } from './types.js'
import type { Track, Album, Artist, Playlist, ParsedTrackData } from '$lib/library/types.ts'

export function adaptYTMTrackToTrack(ytmTrack: YTMTrack): Track {
	return {
		id: parseInt(ytmTrack.id) || Math.floor(Math.random() * 1000000),
		uuid: ytmTrack.id,
		name: ytmTrack.title,
		album: ytmTrack.album || '~\0unknown',
		artists: ytmTrack.author ? [ytmTrack.author] : ['~\0unknown'],
		year: '~\0unknown',
		duration: ytmTrack.duration,
		genre: [],
		trackNo: 0,
		trackOf: 0,
		file: null, // YTM tracks don't have local files
		scannedAt: Date.now(),
		fileName: ytmTrack.title,
		directory: -2 // Special ID for YTM tracks
	}
}

export function adaptYTMPlaylistToPlaylist(ytmPlaylist: YTMPlaylist): Playlist {
	return {
		id: parseInt(ytmPlaylist.id) || Math.floor(Math.random() * 1000000),
		uuid: ytmPlaylist.id,
		name: ytmPlaylist.title,
		description: `${ytmPlaylist.trackCount} tracks${ytmPlaylist.author ? ` • ${ytmPlaylist.author}` : ''}`,
		createdAt: Date.now()
	}
}

export function extractAlbumsFromYTMTracks(tracks: YTMTrack[]): Album[] {
	const albumsMap = new Map<string, Album>()

	for (const track of tracks) {
		if (!track.album) continue

		const albumKey = `${track.album}-${track.author}`
		if (!albumsMap.has(albumKey)) {
			albumsMap.set(albumKey, {
				id: Math.floor(Math.random() * 1000000),
				uuid: albumKey,
				name: track.album,
				artists: track.author ? [track.author] : [],
				year: undefined,
				image: undefined // Could fetch from thumbnail if needed
			})
		}
	}

	return Array.from(albumsMap.values())
}

export function extractArtistsFromYTMTracks(tracks: YTMTrack[]): Artist[] {
	const artistsSet = new Set<string>()
	
	for (const track of tracks) {
		if (track.author) {
			artistsSet.add(track.author)
		}
	}

	return Array.from(artistsSet).map(artist => ({
		id: Math.floor(Math.random() * 1000000),
		uuid: artist,
		name: artist
	}))
}

export function createYTMCompatibleData(state: YTMPlayerState, playlists: YTMPlaylist[]) {
	const allTracks = [
		...(state.track ? [state.track] : []),
		...state.queue
	]

	return {
		tracks: allTracks.map(adaptYTMTrackToTrack),
		albums: extractAlbumsFromYTMTracks(allTracks),
		artists: extractArtistsFromYTMTracks(allTracks),
		playlists: playlists.map(adaptYTMPlaylistToPlaylist)
	}
}