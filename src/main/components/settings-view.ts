import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
} from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin'
import { importTracksIntoLibrary, clearAllTracks } from '../store/library/actions'
import { RootState, store } from '../store'
import { setTheme, setReducedMotion } from '../store/app/actions'
import { isNativeFileSystemSupported, getFilesFromDirectory, getFilesFromLegacyInputEvent } from '../lib/file-system'
import { formatBytesToSize } from '../utils/utils'
import { buttonStyles, headingStyles } from './shared-styles'

import './x-select'
import './x-switch'
import './x-icon'
import './x-icon-button'
import { SUPPORTED_FILE_FORMATS } from '../lib/extract-track-metadata'

@customElement('settings-view')
export class SettingsView extends connect(store)(LitElement) {
  @property()
  theme: 0 | 1 | 2 = 0

  @property()
  reducedMotion: boolean = false

  @property()
  dragging: boolean = false

  @property()
  draggingHover: boolean = false

  @query('#drop-zone')
  dropZoneElement!: HTMLElement

  @property()
  libraryInfo: {
    tracks: number,
    storageUsed?: number,
  } = {
    tracks: -1,
    storageUsed: 0,
  }

  async stateChanged(state: RootState) {
    const { app, library: { tracks } } = state
    const { category } = app.page
    if (category === 'settings') {
      this.theme = app.theme
      this.reducedMotion = app.reducedMotion
      if (this.libraryInfo.tracks !== tracks.list.length && 'storage' in navigator && 'estimate' in navigator.storage) {
        const { usage } = await navigator.storage.estimate()
        this.libraryInfo = {
          tracks: tracks.list.length,
          storageUsed: usage,
        }
      } else {
        this.libraryInfo = {
          tracks: tracks.list.length,
        }
      }
    }
  }

  static get styles() {
    return [
      buttonStyles,
      headingStyles,
      css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--app-surface-0-color);
        --settings-controls-width: 160px
      }
      .header {
        height: var(--app-header-height);
        padding: 0 var(--app-header-height) 0;
        background: transparent;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        justify-content: center;
      }
      .content {
        padding: 24px 16px;
        overflow: auto;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .sizing-container {
        max-width: 800px;
        width: 100%;
        margin: 0 auto;
      }
      .settings-list-item {
        font-size: 14px;
        height: 72px;
        color: var(--app-primary-text-color);
        display: flex;
        align-items: center;
      }
      .settings-list-item [list-end]{
        margin-left: auto;
      }
      .settings-list-item > [list-icon] {
        margin-right: 24px;
        --x-icon-color: var(--app-secondary-icon-color);
      }
      #library-info-message {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: var(--app-secondary-icon-color);
        margin: 0 0 24px 48px;
        background: var(--app-divider-color);
        padding: 12px 16px;
        border-radius: 8px;
        --icon-color: var(--app-secondary-icon-color);
      }
      #library-info-message x-icon {
        flex-shrink: 0;
        margin-right: 16px;
      }
      a {
        color: #fff;
      }

      #drop-zone {
        background: var(--app-divider-color);
        border: 2px solid var(--app-divider-color);
        color: var(--app-secondary-icon-color);
        box-sizing: border-box;
        transition: background 0.2s, box-shadow 0.4s;
        margin-left: 48px;
        border-radius: 8px;
        padding: 16px;
        height: 128px;
        font-size: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }
      #drop-zone[dragging] {
        box-shadow: var(--elevation-2dp);
        border-radius: 8px;
        padding: 0 14px;
      }
      #drop-zone[dragginghover] {
        background: var(--app-accent-color);
        box-shadow: var(--elevation-8dp);
      }
      #drop-zone-input {
        position: absolute;
        width: 100%;
        height: 100%;
        opacity: 0;
      }
      #drop-zone-input::-webkit-file-upload-button {
        height: 100%;
        width: 100%;
      }
      #drop-zone-input::-moz-file-upload-button {
        height: 100%;
        width: 100%;
      }
      #library-info-message[hidden],
      #drop-zone[hidden] {
        display: none;
      }
      button {
        background: rgb(108, 108, 108);
        width: var(--settings-controls-width);
      }
      x-select {
        width: var(--settings-controls-width);
      }
      @media (max-width: 600px) {
        #library-info-message {
          margin: 0px 0px 24px;
        }
        #drop-zone {
          margin: 0;
        }
      }
      `,
    ]
  }

  render() {
    return html`
      <div class='header'>
        <h1 class='title'>Settings</h1>
      </div>
      <div class='content'>
        <div class='sizing-container'>
          <div class='settings-list-item'>
            <x-icon .icon=${'libraryMusic'} list-icon></x-icon>
            <div list-content1>Library</div>
            <button
                class='settings-btn'
                list-end
                @click=${this.onFilesSelectClickHandler}>
              Select new directory
            </button>
          </div>
          <div id='library-info-message' ?hidden=${isNativeFileSystemSupported}>
            <x-icon .icon=${'informationOutline'}></x-icon>
            <div>
              This browser does not yet support
              <a target='_blank' href='https://wicg.github.io/native-file-system/'>Native FileSystem</a>
              on the web. In order for this app to function correctly imported music files need to be duplicated inside browser storage.
            </div>
          </div>
          <div
              ?hidden=${/** If NFS is available prefer to use it and drag and drop doesnt support that yet */isNativeFileSystemSupported}
              ?dragging=${this.dragging}
              ?dragginghover=${this.draggingHover}
              id='drop-zone'>
            <input
                id='drop-zone-input'
                type='file'
                directory webkitdirectory
                @change=${this.onFilesDropChangeHandler}>
            Drag and drop directory or file you want to include to your library here
          </div>

          <div class='settings-list-item'>
            <x-icon .icon=${'chartIcon'} list-icon></x-icon>
            <div>
              ${this.libraryInfo.tracks} Tracks ${this.libraryInfo.storageUsed ? `/ ${formatBytesToSize(this.libraryInfo.storageUsed)} Used storage` : ''}
            </div>
            <button
                class='settings-btn'
                list-end
                @click=${() => store.dispatch(clearAllTracks())}>
              Clear library
            </button>
          </div>

          <div class='settings-list-item'>
            <x-icon .icon=${'lightBulbOutline'} list-icon></x-icon>
            <div list-content1>Application theme</div>
            <x-select
                list-end
                .selected=${this.theme}
                .items=${['Dark', 'Light (Unfinished)', 'Automatic']}
                @input=${({ detail }: CustomEvent) => store.dispatch(setTheme(detail))}>
            </x-select>
          </div>
          <div class='settings-list-item'>
            <x-icon .icon=${'animation'} list-icon></x-icon>
            <div list-content1>Reduced motion</div>
            <x-switch
                list-end
                .checked=${this.reducedMotion}
                @input=${({ detail }: CustomEvent) => store.dispatch(setReducedMotion(detail))}>
            </x-switch>
          </div>
        </div>
      </div>
    `
  }

  firstUpdated() {
    this.dropZoneElement.addEventListener('dragenter', () => { this.draggingHover = true })
    this.dropZoneElement.addEventListener('dragleave', () => { this.draggingHover = false })

    document.addEventListener('dragenter', () => { this.draggingHover = true })
    document.addEventListener('dragleave', () => { this.draggingHover = false })

    document.addEventListener('drop', () => {
      this.draggingHover = false
      this.dragging = false
    })
  }

  async onFilesSelectClickHandler() {
    const filesData = await getFilesFromDirectory(SUPPORTED_FILE_FORMATS)
    store.dispatch(importTracksIntoLibrary(filesData))
  }

  onFilesDropChangeHandler(e: Event) {
    const filesData = getFilesFromLegacyInputEvent(e, SUPPORTED_FILE_FORMATS)
    store.dispatch(importTracksIntoLibrary(filesData))
  }
}
