import {
  LitElement,
  html,
  css,
  property,
  customElement,
} from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin'
import { removeToast, addToast } from '../store/toasts/actions'
import { RootState, store } from '../store'
import { State as MenuState } from '../store/menu/types'
// eslint-disable-next-line
import { ToastData } from './x-toast'
// eslint-disable-next-line
import './x-toast'
import './x-menu'
import './library-view/library-view'
import './player-panel/player-panel'
import './info-view'

import { PageType } from '../store/app/types'
import { closeMenu } from '../store/menu/actions'

@customElement('app-shell')
export class AppShell extends connect(store)(LitElement) {
  @property()
  page!: PageType

  @property()
  toasts: ToastData[] = []

  @property()
  reducedMotion: boolean = false

  @property()
  menu?: MenuState

  stateChanged({ app, toasts, menu }: RootState) {
    this.page = app.page
    this.toasts = toasts
    this.reducedMotion = app.reducedMotion
    this.menu = menu

    const themes = ['dark', 'light', 'auto']
    themes.forEach((theme, index) => {
      const themeAttr = `theme-${theme}`
      if (app.theme === index) {
        document.documentElement.setAttribute(themeAttr, '')
      } else {
        document.documentElement.removeAttribute(themeAttr)
      }
    })
    if (this.reducedMotion) {
      document.documentElement.setAttribute('reduced-motion', '')
    } else {
      document.documentElement.removeAttribute('reduced-motion')
    }
  }

  static styles = css`
  :host {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
    --player-offset: 88px;
    --app-header-height: 64px;
  }
  .view {
    position: absolute;
    width: inherit;
    height: 100%;
  }
  library-view.view {
    position: relative;
  }
  #back-button {
    position: absolute;
    top: 12px;
    left: 24px;
    z-index: 99;
  }
  #toast-container {
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 2;
    width: 100%;
    max-width: 344px;
    padding: 0 16px;
    box-sizing: border-box;
    transition: transform .2s;
    pointer-events: none;
    --x-toast-accent-color: var(--app-accent-color);
  }
  #toast-container[offset] {
    transform: translateY(calc(var(--player-offset) * -1));
  }
  #playlist-dialog {
    position: absolute;
    height: 100%;
    width: 100%;
    max-width: 400px;
    max-height: 500px;
    background: var(--app-surface-3-color);
    border-radius: 8px;
    margin: auto;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: none;
  }
  [hidden] {
    display: none;
  }
  @media (max-width: 700px) {
    :host {
      --player-offset: 64px;
      --app-header-height: 56px;
    }
    #back-button {
      top: 8px;
    }
    #toast-container[inqueue] {
      transform: none;
    }
  }
  @media (max-width: 448px) {
    #toast-container {
      max-width: 100%;
    }
  }`

  render() {
    const menuTemplate = this.menu && this.menu.isOpen ? html`
      <x-menu
          .items=${this.menu.items}
          .position=${this.menu.position}
          @close=${() => store.dispatch(closeMenu())}>
      </x-menu>` : html``

    const toastsTemplate = this.toasts.map(toast => html`
      <x-toast
          .animationEnabled=${!this.reducedMotion}
          .data=${toast}
          @dismiss=${() => store.dispatch(removeToast(toast.id))}>
      </x-toast>`)

    return html`
      <div id='toast-container' ?inqueue=${this.page.category === 'queue'} ?offset=${this.page.category !== 'settings'}>
        ${toastsTemplate}
      </div>
      <x-icon-button id='back-button' ?hidden=${!['settings', 'artist', 'album', 'playlist', 'queue'].includes(this.page.category)} .icon=${'backArrow'} @click=${() => history.back()}></x-icon-button>
      <library-view></library-view>
      <search-view></search-view>
      <info-view></info-view>
      <queue-panel></queue-panel>
      <player-panel></player-panel>
      <settings-view ?hidden=${this.page.category !== 'settings'} class='view'></settings-view>
      ${menuTemplate}
  `
  }

  async firstUpdated() {
    window.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
    })
    store.dispatch(addToast({
      title: 'This is work in progress! Some things might not work as they should if at all.',
      id: 'under-construction',
      button: {
        title: 'Understood',
      },
    }))
  }
}

// Edge 18 <= does not support global try catch.
const setupServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const needToShowReloadButton = registrations.length > 0
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        // eslint-disable-next-line
        console.log('ServiceWorker registration successful')

        if (needToShowReloadButton) {
          registration.onupdatefound = () => {
            store.dispatch(addToast({
              title: 'New update is available',
              id: 'update-available',
              button: {
                title: 'Reload',
                handler: () => location.reload(),
              },
            }))
          }
        }
      } catch (err) {
        // eslint-disable-next-line
        console.log('ServiceWorker registration failed: ', err)
      }
    })
  }
}

setupServiceWorker()
