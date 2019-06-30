import { connect } from 'pwa-helpers/connect-mixin'
import { installMediaQueryWatcher } from 'pwa-helpers/media-query'
import {
  LitElement,
  html,
  property,
  query,
  customElement,
} from 'lit-element'
import * as PlayerActions from '../../store/player/actions'
import * as LibraryActions from '../../store/library/actions'
import { activeTrackSelector, tracksInQueueSelector } from '../../store/player/reducer'
import { ANIMATION_CURVES } from '../../utils/animation-curves'

import { Track } from '../../typings/interface'
import { nullToUnknown, getImageUrl, formatTime } from '../../utils/utils'
import { RootState, store } from '../../store'

import styles from './player-panel-styles'
import '../x-icon-button'
import '../x-slider'
import { addToast } from '../../store/toasts/actions'
import { openMenu } from '../../store/menu/actions'
import '../track-list-item'
import { isMediaSessionSupported } from '../../lib/supported'

if (isMediaSessionSupported && navigator.mediaSession) {
  navigator.mediaSession.setActionHandler('play', () => store.dispatch(PlayerActions.play()))
  navigator.mediaSession.setActionHandler('pause', () => store.dispatch(PlayerActions.pause()))
  navigator.mediaSession.setActionHandler('seekbackward', () => {
    const { player: { currentTime } } = store.getState()
    store.dispatch(PlayerActions.setCurrentTime(Math.max(currentTime - 10, 0)))
  })
  navigator.mediaSession.setActionHandler('seekforward', () => {
    const { player } = store.getState()
    const { duration } = activeTrackSelector(player)
    store.dispatch(PlayerActions.setCurrentTime(Math.min(player.currentTime + 10, duration)))
  })
  navigator.mediaSession.setActionHandler('previoustrack', () => store.dispatch(PlayerActions.playPreveousTrack()))
  navigator.mediaSession.setActionHandler('nexttrack', () => store.dispatch(PlayerActions.playNextTrack()))
}

@customElement('player-panel')
export class PlayerPanel extends connect(store)(LitElement) {
  audio = new Audio()

  @property()
  tracks: Track[] = []

  @property()
  activeTrack?: Track

  @property()
  isPlaying: boolean = false

  @property()
  currentTime: number = 0

  @property()
  volume: number = 0

  @property()
  isMuted: boolean = false

  @query('.content')
  content?: HTMLElement

  @query('#queue-panel')
  queuePanelElement?: HTMLElement

  @property()
  repeat: number = 0

  @property()
  shuffle: boolean = false

  @property()
  isDesktopMode: boolean = true

  @property()
  isQueueOpen: boolean = false

  async stateChanged(state: RootState) {
    const {
      isPlaying,
      repeat,
      shuffle,
      currentTime,
      volume,
    } = state.player
    this.isPlaying = isPlaying
    this.repeat = repeat
    this.shuffle = shuffle
    this.currentTime = currentTime
    this.volume = volume
    this.isMuted = state.player.isMuted

    const { page: { category } } = state.app
    const isQueueOpen = category === 'queue'
    if (isQueueOpen) {
      this.tracks = tracksInQueueSelector(state.player)
      if (this.isQueueOpen !== isQueueOpen) {
        this.isQueueOpen = isQueueOpen
        await this.updateComplete
        const el = this.renderRoot.querySelector('#queue-panel') as HTMLElement
        const sharedTiming: AnimationEffectTiming = {
          duration: 250,
          easing: ANIMATION_CURVES.decelerationCurve,
          fill: 'both',
        }

        el.animate({
          transform: ['translateY(100%)', 'none'],
        }, sharedTiming)
      }
    }
    this.isQueueOpen = isQueueOpen
    this.setAudioProperties(state)
  }

  async setAudioProperties(state: RootState) {
    const activeTrack = activeTrackSelector(state.player)
    if (this.activeTrack !== activeTrack) {
      this.activeTrack = activeTrack

      if (!this.audio.paused) {
        await this.audio.pause()
      }

      if (activeTrack) {
        const oldAudioSrc = this.audio.src
        const { fileData } = activeTrack
        if (fileData.type === 'fileRef') {
          const file = await fileData.data.getFile()
          this.audio.src = URL.createObjectURL(file)
        } else {
          this.audio.src = URL.createObjectURL(fileData.data)
        }
        URL.revokeObjectURL(oldAudioSrc)
        if (isMediaSessionSupported && navigator.mediaSession) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: this.activeTrack.name,
            artist: this.activeTrack.artist,
            album: this.activeTrack.album,
            artwork: [
              { src: getImageUrl(this.activeTrack), sizes: '512x512', type: 'image/png' },
            ],
          })
        }
      }
    }
    if (activeTrack) {
      const timeUtillEndDiff = Math.abs(this.activeTrack.duration - this.currentTime)
      if (this.isPlaying && timeUtillEndDiff > 1) {
        this.audio.play().catch(() => this.audio.play())
      }
      if (!this.isPlaying) {
        await this.audio.pause()
      }
      const timeDiff = this.audio.currentTime - this.currentTime
      if (this.currentTime !== undefined && Math.abs(timeDiff) > 1) {
        this.audio.currentTime = this.currentTime
      }
    }
    const volumeAdjusted = this.volume / 100
    if (this.audio.volume !== volumeAdjusted) {
      this.audio.volume = volumeAdjusted
    }
    this.audio.loop = this.repeat === 1
    this.audio.muted = this.isMuted
  }

  static styles = styles

  render() {
    const timelineSlider = html`
    <x-slider
      class='player-timeline-slider'
      .max=${1000}
      .value=${this.activeTrack ? (this.currentTime * 1000 / this.activeTrack.duration) : 0 || 0}
      @change=${({ detail }: CustomEvent) => this.setCurrentTime(detail as number)}>
    </x-slider>`

    // Basic player controls showed only
    // when player bar is small
    const miniControls = html`
    <x-icon-button
        @click=${() => store.dispatch(PlayerActions.pause())}>
      <div class='play-button-icon' ?playing=${this.isPlaying}></div>
    </x-icon-button>
    <x-icon-button
        id='mini-next-button'
        .icon=${'skipNext'}
        @click=${() => store.dispatch(PlayerActions.playNextTrack())}>
    </x-icon-button>
    <x-icon-button
        id='queue-button'
        .icon=${'playlist'}
        href=${'/queue'}>
    </x-icon-button>`

    const fullControls = html`
    <x-icon-button
        @click=${() => store.dispatch(PlayerActions.toggleRepeatState())}
        .icon=${['repeat', 'repeatOne', 'repeatOff'][this.repeat]}>
    </x-icon-button>
    <x-icon-button
        .icon=${'skipPrevious'}
        @click=${() => store.dispatch(PlayerActions.playPreveousTrack())}>
    </x-icon-button>
    <x-icon-button
        class='play-button'
        @click=${() => store.dispatch(PlayerActions.playPause())}>
      <div class='play-button-icon' ?playing=${this.isPlaying}></div>
    </x-icon-button>
    <x-icon-button
        .icon=${'skipNext'}
        @click=${() => store.dispatch(PlayerActions.playNextTrack())}>
    </x-icon-button>
    <x-icon-button
        .icon=${this.shuffle ? 'shuffle' : 'shuffleOff'}
        @click=${() => store.dispatch(PlayerActions.toggleShuffle())}>
    </x-icon-button>`

    const controls = this.isDesktopMode ? fullControls : miniControls

    const volumeContainer = html`
    <div class='volume-container'>
      <x-icon-button
          .icon=${this.isMuted ? 'volumeMute' : 'volumeHigh'}
          @click=${() => store.dispatch(PlayerActions.toggleMute())}>
      </x-icon-button>
      <x-slider
          class='volume-slider'
          .value=${this.volume}
          @input=${(e: CustomEvent) => store.dispatch(PlayerActions.setVolume(e.detail))}>
      </x-slider>
    </div>`

    const secondaryControls = this.isDesktopMode ? html`
    <div class='secondary-controls'>
      <x-icon-button
          .icon=${'playlist'}
          href=${'/queue'}>
      </x-icon-button>
      ${volumeContainer}
    </div>` : html``

    const playerBarTimeline = this.activeTrack && this.isDesktopMode
      ? html`
      <div class='timeline'>
          ${timelineSlider}
          <div class='time'>${formatTime(this.currentTime)}</div>
          <div class='time time-end'>${formatTime(this.activeTrack.duration)}</div>
      </div>
      ` : html`${timelineSlider}`

    const activeTrackInfoTemplate = html`
    <div class='active-track-info'>
      ${this.activeTrack ? html`
      <div>${nullToUnknown(this.activeTrack.name)}</div>
      <div>${nullToUnknown(this.activeTrack.artist)}</div>` : html``}
    </div>`

    let queuePanelTemplate = html``
    if (this.isQueueOpen) {
      const queuePlayerControls = !this.isDesktopMode ? html`
      <div id='queue-player'>
        <div
            id='queue-player-img'
            class='img'
            style='background-image: url(${this.activeTrack ? getImageUrl(this.activeTrack) : ''})'>
        </div>
        <div id='queue-player-right'>
          ${volumeContainer}
          <div id='queue-player-controls' class='controls'>
            ${fullControls}
          </div>
        </div>
      </div>
      ${timelineSlider}
      ${activeTrackInfoTemplate}
      ` : html``

      queuePanelTemplate = html`
        <header id='queue-header'>
          <h1>Now playing</h1>
        </header>
        <div class='content'>
          ${queuePlayerControls}
        <virtual-list
          .scroller=${this.queuePanelElement}
          .items=${this.tracks}
          .template=${(track: Track, index: number) => html`
            <track-list-item
                .track=${track}
                ?playing=${this.activeTrack === track}
                @click=${() => store.dispatch(PlayerActions.playTrack(index))}
                @contextmenu=${(e: MouseEvent) => {
                  const menuItems = [{
                    name: 'Play',
                      fn: () => store.dispatch(PlayerActions.playTrack(index)),
                    }, {
                      name: 'Add to playlist',
                      fn: () => store.dispatch(LibraryActions.openPlaylistDialog(track)),
                    }, {
                      name: 'Remove from library',
                      fn: () => store.dispatch(LibraryActions.removeTrack(track)),
                    }]
                  store.dispatch(openMenu(e, menuItems))
                }}>
            </track-list-item>
          `}>
          </div>
        </virtual-list>
      `
    }

    return html`
      <div id='player-bar' ?hidden=${!this.isDesktopMode && this.isQueueOpen}>
        ${playerBarTimeline}
        <div id='player-bar-content'>
          <div
              id='player-bar-img'
              class='img'
              style='background-image: url(${this.activeTrack ? getImageUrl(this.activeTrack) : ''})'>
          </div>
          ${activeTrackInfoTemplate}
          <div class='controls' ?disabled=${!this.activeTrack}>
            ${controls}
          </div>
          ${secondaryControls}
        </div>
      </div>
      <div id='queue-panel' ?hidden=${!this.isQueueOpen}>
      ${queuePanelTemplate}
      </div>
    `
  }

  constructor() {
    super()
    installMediaQueryWatcher('(min-width: 700px)', (matches) => {
      this.isDesktopMode = matches
    })

    this.audio.ontimeupdate = () => {
      if (this.isPlaying) {
        store.dispatch(PlayerActions.setCurrentTime(this.audio.currentTime))
      }
    }
    const MESSAGGES = {
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE: 3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
    }
    this.audio.onerror = () => {
      if (!this.audio.error) {
        return
      }
      switch (this.audio.error.code) {
      case MESSAGGES.MEDIA_ERR_SRC_NOT_SUPPORTED:
        store.dispatch(addToast({
          id: 'unknown-err',
          title: 'Selected audio file cannot be played.',
          button: true,
        }))
        break
      default:
        store.dispatch(addToast({
          id: 'unknown-err',
          title: 'Unknown Error has occurred while trying to play audio.',
          button: true,
        }))
      }
      store.dispatch(PlayerActions.pause())
    }
    this.audio.onended = () => {
      switch (this.repeat) {
      case 0:
        // Go through the queue.
        store.dispatch(PlayerActions.playNextTrack())
        break
      case 1:
        // Repeat the same song.
        // Do nothing since loop property
        // is set on audio element itself.
        break
      default:
        store.dispatch(PlayerActions.pause())
        break
      }
    }
  }

  setCurrentTime(value: number) {
    const duration = this.activeTrack ? this.activeTrack.duration : 0
    store.dispatch(PlayerActions.setCurrentTime(value / 1000 * duration))
  }
}
