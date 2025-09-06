import { io, type Socket } from 'socket.io-client'
import type {
	YTMAuthRequest,
	YTMAuthResponse,
	YTMTokenRequest,
	YTMTokenResponse,
	YTMPlayerState,
	YTMPlaylist,
	YTMConnection,
	YTMCommandData
} from './types.js'

export class YTMAPIClient {
	private socket: Socket | null = null
	private connection: YTMConnection | null = null
	private onStateUpdate?: (state: YTMPlayerState) => void
	private onConnectionChange?: (connected: boolean) => void

	constructor() {
		// Restore connection from localStorage if available
		this.loadConnection()
	}

	private getBaseUrl(host: string = '127.0.0.1', port: number = 9863): string {
		// Try to use secure connection if the current page is HTTPS
		const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' 
			? 'https'  // Attempt HTTPS first for secure contexts
			: 'http'   // Default to HTTP for local development
		
		return `${protocol}://${host}:${port}/api/v1`
	}

	private async fetchAPI<T>(endpoint: string, options?: RequestInit, host?: string, port?: number): Promise<T> {
		const baseUrl = this.getBaseUrl(host, port)
		const url = `${baseUrl}${endpoint}`

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...options?.headers as Record<string, string>
		}

		if (this.connection?.token) {
			headers['Authorization'] = this.connection.token
		}

		const response = await fetch(url, {
			...options,
			headers
		})

		if (!response.ok) {
			throw new Error(`YTM API request failed: ${response.status} ${response.statusText}`)
		}

		return response.json()
	}

	async requestAuthCode(request: YTMAuthRequest, host = '127.0.0.1', port = 9863): Promise<string> {
		const response = await this.fetchAPI<YTMAuthResponse>('/auth/requestcode', {
			method: 'POST',
			body: JSON.stringify(request)
		}, host, port)

		return response.code
	}

	async exchangeToken(request: YTMTokenRequest, host = '127.0.0.1', port = 9863): Promise<string> {
		const response = await this.fetchAPI<YTMTokenResponse>('/auth/request', {
			method: 'POST',
			body: JSON.stringify(request)
		}, host, port)

		this.connection = {
			host,
			port,
			token: response.token,
			connected: false
		}

		this.saveConnection()
		return response.token
	}

	async getPlayerState(): Promise<YTMPlayerState | null> {
		if (!this.connection?.token) {
			throw new Error('Not authenticated')
		}

		return this.fetchAPI<YTMPlayerState>('/state', undefined, this.connection.host, this.connection.port)
	}

	async getPlaylists(): Promise<YTMPlaylist[]> {
		if (!this.connection?.token) {
			throw new Error('Not authenticated')
		}

		return this.fetchAPI<YTMPlaylist[]>('/playlists', undefined, this.connection.host, this.connection.port)
	}

	async sendCommand(command: string, data?: YTMCommandData): Promise<void> {
		if (!this.connection?.token) {
			throw new Error('Not authenticated')
		}

		const body = data !== undefined ? { command, data } : { command }
		
		await this.fetchAPI('/command', {
			method: 'POST',
			body: JSON.stringify(body)
		}, this.connection.host, this.connection.port)
	}

	connectSocket(onStateUpdate?: (state: YTMPlayerState) => void, onConnectionChange?: (connected: boolean) => void): void {
		if (!this.connection?.token) {
			throw new Error('Not authenticated')
		}

		// Use the same protocol detection as HTTP requests
		const httpProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' 
			? 'https'  // Secure HTTP for HTTPS contexts
			: 'http'   // Regular HTTP for HTTP contexts

		const socketUrl = `${httpProtocol}://${this.connection.host}:${this.connection.port}/api/v1/realtime`
		console.log('[YTM Client] Connecting socket to:', socketUrl)

		this.onStateUpdate = onStateUpdate
		this.onConnectionChange = onConnectionChange

		this.socket = io(socketUrl, {
			auth: {
				token: this.connection.token
			},
			transports: ['websocket'],
			forceNew: true
		})

		this.socket.on('connect', () => {
			console.log('[YTM Client] Socket connected successfully')
			if (this.connection) {
				this.connection.connected = true
				this.saveConnection()
			}
			this.onConnectionChange?.(true)
			
			// Request initial state via socket (doesn't count against rate limit)
			console.log('[YTM Client] Requesting current state via socket...')
			this.requestCurrentState()
		})

		this.socket.on('disconnect', (reason) => {
			console.log('[YTM Client] Socket disconnected:', reason)
			if (this.connection) {
				this.connection.connected = false
				this.saveConnection()
			}
			this.onConnectionChange?.(false)
		})

		this.socket.on('state-update', (state: YTMPlayerState) => {
			console.log('[YTM Client] Received state update via socket')
			this.onStateUpdate?.(state)
		})

		this.socket.on('connect_error', (error) => {
			console.error('[YTM Client] Socket connection error:', error)
			this.onConnectionChange?.(false)
		})
	}

	requestCurrentState(): void {
		if (this.socket?.connected) {
			console.log('[YTM Client] Emitting state request via socket...')
			this.socket.emit('get-state')
		}
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect()
			this.socket = null
		}

		if (this.connection) {
			this.connection.connected = false
			this.saveConnection()
		}

		this.onConnectionChange?.(false)
	}

	isConnected(): boolean {
		return this.socket?.connected || false
	}

	getCurrentConnection(): YTMConnection | null {
		return this.connection
	}

	private saveConnection(): void {
		if (this.connection) {
			localStorage.setItem('ytm-connection', JSON.stringify(this.connection))
		}
	}

	private loadConnection(): void {
		const saved = localStorage.getItem('ytm-connection')
		if (saved) {
			try {
				this.connection = JSON.parse(saved)
			} catch (e) {
				console.error('Failed to load YTM connection:', e)
			}
		}
	}

	setConnection(connection: YTMConnection): void {
		this.connection = connection
		this.saveConnection()
	}

	clearConnection(): void {
		console.log('[YTM Client] Clearing stored connection...')
		this.connection = null
		localStorage.removeItem('ytm-connection')
		if (this.socket) {
			this.socket.disconnect()
			this.socket = null
		}
	}
}