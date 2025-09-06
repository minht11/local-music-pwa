<script lang="ts">
	import Button from '$lib/components/Button.svelte'
	import TextField from '$lib/components/TextField.svelte'
	import Switch from '$lib/components/Switch.svelte'
	import { ytmStore } from '$lib/services/ytm-api'
	import type { YTMConnection } from '$lib/services/ytm-api'

	interface Props {
		onConnectionChange?: (connected: boolean) => void
	}

	let { onConnectionChange }: Props = $props()

	// Connection settings
	let host = $state('127.0.0.1')
	let port = $state(9863)
	let enableYTM = $state(false)
	
	// Saved connections
	let savedConnections = $state<YTMConnection[]>([])

	// Persist YTM settings
	$effect.root(() => {
		// Load persisted settings
		const savedHost = localStorage.getItem('ytm-host')
		const savedPort = localStorage.getItem('ytm-port')
		const savedEnableYTM = localStorage.getItem('ytm-enabled')
		
		if (savedHost) host = savedHost
		if (savedPort) port = parseInt(savedPort, 10) || 9863
		if (savedEnableYTM) enableYTM = savedEnableYTM === 'true'

		// Persist changes
		$effect(() => {
			try {
				localStorage.setItem('ytm-host', host)
				localStorage.setItem('ytm-port', port.toString())
				localStorage.setItem('ytm-enabled', enableYTM.toString())
			} catch (error) {
				console.warn('Failed to persist YTM settings:', error)
			}
		})
	})

	// Load existing connection on mount
	$effect(() => {
		const existing = ytmStore.getCurrentConnection()
		if (existing) {
			host = existing.host
			port = existing.port
			enableYTM = true
		}
	})

	$effect(() => {
		onConnectionChange?.(ytmStore.isConnected)
	})

	async function handleConnect() {
		if (ytmStore.isConnected) {
			await ytmStore.disconnect()
			return
		}

		const success = await ytmStore.connect(host, port)
		
		if (success) {
			// Save this connection for future use
			const connection: YTMConnection = {
				host,
				port,
				token: ytmStore.getCurrentConnection()?.token,
				connected: true
			}
			
			// Add to saved connections if not already there
			const existingIndex = savedConnections.findIndex(
				c => c.host === host && c.port === port
			)
			
			if (existingIndex >= 0) {
				savedConnections[existingIndex] = connection
			} else {
				savedConnections.push(connection)
			}
		}
	}

	function handleUseSavedConnection(connection: YTMConnection) {
		host = connection.host
		port = connection.port
		ytmStore.setConnection(connection)
	}

	function handleRemoveSavedConnection(index: number) {
		savedConnections.splice(index, 1)
	}
</script>

<div class="ytm-connection-setup">
	<div class="setting-item">
		<div class="setting-header">
			<h3>YouTube Music Desktop Integration</h3>
			<Switch bind:checked={enableYTM} />
		</div>
		<p class="setting-description">
			Connect to YouTube Music Desktop app to stream music instead of using local files.
		</p>
	</div>

	{#if enableYTM}
		<div class="connection-settings">
			<div class="input-group">
				<label for="ytm-host">Host:</label>
				<TextField
					name="ytm-host"
					bind:value={host}
					placeholder="127.0.0.1"
					class={ytmStore.isConnecting ? "disabled" : ""}
				/>
			</div>

			<div class="input-group">
				<label for="ytm-port">Port:</label>
				<input
					name="ytm-port"
					type="number"
					bind:value={port}
					placeholder="9863"
					disabled={ytmStore.isConnecting}
					class="text-field-input"
				/>
			</div>

			<div class="connection-actions">
				<Button 
					onclick={handleConnect}
					disabled={ytmStore.isConnecting}
					kind={ytmStore.isConnected ? 'outlined' : 'filled'}
				>
					{#if ytmStore.isConnecting}
						Connecting...
					{:else if ytmStore.isConnected}
						Disconnect
					{:else}
						Connect
					{/if}
				</Button>

				{#if ytmStore.isConnected}
					<div class="status connected">
						✓ Connected to YouTube Music Desktop
					</div>
				{:else if ytmStore.lastError}
					<div class="status error">
						⚠ {ytmStore.lastError}
					</div>
				{/if}
			</div>

			{#if ytmStore.isConnecting}
				<div class="connection-help">
					<p>Please approve the connection request in YouTube Music Desktop app.</p>
					<p>Look for a notification asking you to approve "Local Music PWA".</p>
				</div>
			{/if}

			{#if savedConnections.length > 0}
				<div class="saved-connections">
					<h4>Saved Connections</h4>
					{#each savedConnections as connection, index}
						<div class="saved-connection-item">
							<div class="connection-info">
								<span class="host">{connection.host}:{connection.port}</span>
								{#if connection.connected}
									<span class="status-badge connected">Last Connected</span>
								{/if}
							</div>
							<div class="connection-actions-small">
								<Button 
									kind="toned"
									onclick={() => handleUseSavedConnection(connection)}
									disabled={ytmStore.isConnecting}
								>
									Use
								</Button>
								<Button 
									kind="flat"
									onclick={() => handleRemoveSavedConnection(index)}
									disabled={ytmStore.isConnecting}
								>
									Remove
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.ytm-connection-setup {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.setting-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.setting-description {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin: 0;
	}

	.connection-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--border);
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.input-group label {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.connection-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status {
		padding: 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status.connected {
		background: var(--success-bg);
		color: var(--success-text);
		border: 1px solid var(--success-border);
	}

	.status.error {
		background: var(--error-bg);
		color: var(--error-text);
		border: 1px solid var(--error-border);
	}

	.connection-help {
		padding: 1rem;
		background: var(--info-bg);
		color: var(--info-text);
		border: 1px solid var(--info-border);
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.connection-help p {
		margin: 0;
	}

	.connection-help p + p {
		margin-top: 0.5rem;
	}

	.saved-connections {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.saved-connections h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.saved-connection-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border-radius: 0.375rem;
		border: 1px solid var(--border);
	}

	.connection-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.host {
		font-family: monospace;
		font-size: 0.875rem;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-weight: 500;
	}

	.status-badge.connected {
		background: var(--success-bg);
		color: var(--success-text);
	}

	.connection-actions-small {
		display: flex;
		gap: 0.5rem;
	}

	.text-field-input {
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.875rem;
		width: 100%;
	}

	.text-field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.text-field-input:focus {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}
</style>