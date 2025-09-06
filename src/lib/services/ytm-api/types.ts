export interface YTMAuthRequest {
	appId: string
	appName: string
	appVersion: string
}

export interface YTMAuthResponse {
	code: string
}

export interface YTMTokenRequest {
	appId: string
	code: string
}

export interface YTMTokenResponse {
	token: string
}

export interface YTMTrack {
	title: string
	artists: string[]
	album?: string
	duration: number
	thumbnail: string
	id: string
	url: string
	primaryColor?: number
}

export interface YTMPlayerState {
	player: {
		trackState: number // 0 = paused, 1 = playing, 2 = buffering
		videoProgress: number
		volume: number
		repeatType?: string
		shuffleActive?: boolean
		adPlaying?: boolean
		queue?: {
			items?: Array<{
				thumbnails?: Array<{
					url: string
					width?: number
					height?: number
				}>
				title: string
				author: string
				duration?: string
				selected?: boolean
				videoId: string
				counterparts?: any[] | null
			}>
			automixItems?: Array<{
				thumbnails?: Array<{
					url: string
					width?: number
					height?: number
				}>
				title: string
				author: string
				duration?: string
				selected?: boolean
				videoId: string
				counterparts?: any[] | null
			}>
			isGenerating?: boolean
			isInfinite?: boolean
			repeatMode?: number
			selectedItemIndex?: number
		}
	}
	video: {
		title: string
		author: string
		channelId?: string
		id: string
		isLive?: boolean
		thumbnails?: Array<{
			url: string
			width?: number
			height?: number
		}>
		duration?: {
			seconds: number
			text: string
		}
		durationSeconds: number
		album?: string
	}
	playlistId?: string
}

export interface YTMPlaylist {
	id: string
	title: string
	trackCount: number
	thumbnail?: string
	author?: string
}

export interface YTMCommandData {
	// Common command data types
	playlistId?: string
	videoId?: string
	index?: number
	volume?: number
	position?: number
	query?: string
	// Allow additional properties for extensibility
	[key: string]: unknown
}

export interface YTMConnection {
	host: string
	port: number
	token?: string
	connected: boolean
}

export interface YTMSettings {
	lastConnection?: YTMConnection
	savedConnections: YTMConnection[]
}