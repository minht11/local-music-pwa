import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
} from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin'
import { store, RootState } from '../store'
import { InfoViewData, Track } from '../typings/interface'
import { ANIMATION_CURVES } from '../utils/animation-curves'
import { formatTime, getImageUrl } from '../utils/utils'
import { PageType } from '../store/app/types'
import { activeTrackSelector } from '../store/player/reducer'
import { scrollbarStyles, headingStyles } from './shared-styles'
import * as PlayerActions from '../store/player/actions'
import * as LibraryActions from '../store/library/actions'
import { openMenu } from '../store/menu/actions'

@customElement('info-view')
export class InfoView extends connect(store)(LitElement) {
  @query('#background')
  backgroundElement!: HTMLElement

  @query('.content')
  contentElement!: HTMLElement

  @property()
  open: boolean = false

  @property()
  infoData?: InfoViewData

  @property()
  tracks: Track[] = []

  @property()
  page!: PageType

  duration: number = 0

  @property()
  activeTrack?: Track

  @property()
  reducedMotion: boolean = false

  // TO-DO. When tabs width changes inside observer dispatch redux property
  // or something to recalculate data.
  stateChanged(state: RootState) {
    const { page } = state.app
    const { category, subCategory } = page
    const categories = ['artist', 'album', 'playlist']
    if (categories.includes(category)) {
      this.activeTrack = activeTrackSelector(state.player)
      if (this.page.category !== category || this.page.subCategory !== subCategory) {
        this.reducedMotion = state.app.reducedMotion
        this.infoData = state.app.infoViewData
        if (this.infoData) {
          const { library } = state
          const { list: allTracks } = library.tracks
          // @ts-ignore
          this.tracks = allTracks.filter(({ id }) => this.infoData.tracksIds.includes(id))
        }

        this.style.display = 'flex'
        this.transition()
      }
    } else {
      this.style.display = ''
    }
    this.page = page
  }

  async transition() {
    if (this.reducedMotion) {
      return
    }
    const sharedTiming: AnimationEffectTiming = {
      duration: 250,
      easing: ANIMATION_CURVES.decelerationCurve,
      fill: 'both',
    }

    this.contentElement.animate({
      transform: ['translateY(100%)', 'none'],
    }, sharedTiming)
    this.backgroundElement.animate({
      opacity: [0, 1],
    }, sharedTiming)
  }

  static get styles() {
    return [
      headingStyles,
      scrollbarStyles,
      css`
      :host {
        width: 100%;
        height: calc(100% - 88px);
        position: absolute;
        overflow: hidden;
        display: none;
        flex-direction: column;
      }
      #background {
        background: var(--app-surface-0-color);
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transform-origin: left top;
        will-change: transform;
      }
      .title {
        color: #fff;
      }
      .content {
        position: relative;
        z-index: 1;
        grid-area: content;
        display: flex;
        flex-direction: column;
        max-width: 1000px;
        width: 100%;
        height: calc(100% - 72px);
        margin: 72px auto 0;
        border-radius: 24px 24px 0 0;
        background: var(--app-surface-1-color);
      }
      .info-header {
        flex-shrink: 0;
        padding: 24px;
        border-bottom: 1px solid var(--app-divider-color);
        margin-bottom: 8px;
        display: grid;
        grid-template-rows: 1fr 1fr;
        grid-template-columns: 192px 1fr;
        grid-template-areas:
          'img primary'
          'img secondary';
      }
      .info-data {
        display: flex;
        flex-direction: column;
        margin: 0 24px;
      }
      .primary {
        grid-area: primary;
        color: var(--app-primary-text-color);
        font-size: 30px;
        font-weight: 700;
        font-family: bitter, sans-serif;
        letter-spacing: 1px;
      }
      .secondary {
        grid-area: secondary;
      }
      #img {
        height: 192px;
        width: 192px;
        background-size: cover;
        background-color: var(--app-divider-color);
        border-radius: 8px;
        grid-area: img;
        background-size: cover;
      }
      `,
    ]
  }

  render() {
    let content = html``
    if (this.infoData) {
      const styleImg = this.infoData && 'image' in this.infoData
        ? `background-image: url(${this.infoData.image ? getImageUrl(this.infoData) : ''}`
        : ''
      content = html`
      <div class='info-header'>
        <div id='img' style=${styleImg}></div>
        <div class='info-data'>
          <h1 class='secondary'>${this.infoData.name}</h1>
          <div>
            ${formatTime(this.duration)} / ${this.tracks.length}
            ${this.tracks.length === 1 ? 'track' : 'tracks'}
          </div>
        </div>
      </div>
      <virtual-list
          id='songs-tab'
          class='tab-page'
          .scroller=${this.renderRoot.querySelector('.content')}
          .items=${this.tracks}
          .template=${(track: Track, index: number) => html`
            <track-list-item
              .track=${track}
              ?playing=${this.activeTrack === track}
              @click=${() => store.dispatch(PlayerActions.playTrack(index, this.tracks))}
              @contextmenu=${(e: MouseEvent) => {
              const menuItems = [{
                name: 'Play',
                fn: () => store.dispatch(PlayerActions.playTrack(index, this.tracks)),
              }, {
                name: 'Play next',
                fn: () => store.dispatch(PlayerActions.addToQueueNext(track)),
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
      </virtual-list>
      `
    }

    return html`
      <div class='content'>
        ${content}
      </div>
      <div id='background'></div>
    `
  }
}
