/**
 * Production-safe logging utility
 * Logs are conditionally enabled based on environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
	[key: string]: unknown
}

class Logger {
	private isDevelopment = import.meta.env.DEV
	private isEnabled = this.isDevelopment || import.meta.env.VITE_ENABLE_LOGGING === 'true'

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString()
		const contextStr = context ? ` ${JSON.stringify(context)}` : ''
		return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
	}

	private shouldLog(level: LogLevel): boolean {
		if (!this.isEnabled) return false
		
		// Always log errors and warnings
		if (level === 'error' || level === 'warn') return true
		
		// Only log info and debug in development
		return this.isDevelopment
	}

	debug(message: string, context?: LogContext): void {
		if (this.shouldLog('debug')) {
			console.debug(this.formatMessage('debug', message, context))
		}
	}

	info(message: string, context?: LogContext): void {
		if (this.shouldLog('info')) {
			console.info(this.formatMessage('info', message, context))
		}
	}

	warn(message: string, context?: LogContext): void {
		if (this.shouldLog('warn')) {
			console.warn(this.formatMessage('warn', message, context))
		}
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		if (this.shouldLog('error')) {
			const errorContext = error instanceof Error 
				? { ...context, error: error.message, stack: error.stack }
				: { ...context, error }
			console.error(this.formatMessage('error', message, errorContext))
		}
	}

	// YTM-specific logging methods for better categorization
	ytm = {
		debug: (message: string, context?: LogContext) => this.debug(`[YTM] ${message}`, context),
		info: (message: string, context?: LogContext) => this.info(`[YTM] ${message}`, context),
		warn: (message: string, context?: LogContext) => this.warn(`[YTM] ${message}`, context),
		error: (message: string, error?: Error | unknown, context?: LogContext) => this.error(`[YTM] ${message}`, error, context)
	}

	// Player-specific logging methods
	player = {
		debug: (message: string, context?: LogContext) => this.debug(`[Player] ${message}`, context),
		info: (message: string, context?: LogContext) => this.info(`[Player] ${message}`, context),
		warn: (message: string, context?: LogContext) => this.warn(`[Player] ${message}`, context),
		error: (message: string, error?: Error | unknown, context?: LogContext) => this.error(`[Player] ${message}`, error, context)
	}
}

export const logger = new Logger()