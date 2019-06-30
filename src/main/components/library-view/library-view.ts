import {
  LitElement,
  html,
  customElement,
  property,
  query,
} from 'lit-element'
import { connect } from 'pwa-helpers/connect-mixin'
import animateScrollTo from 'animated-scroll-to'
import { debounce } from 'typescript-debounce-decorator'
import {
  Track, Album, Artist, Playlist,
} from '../../typings/interface'
import { RootState, store } from '../../store'
import { PageType } from '../../store/app/types'
import {
  searchTermSelector,
  sortedAndFilteredTracks,
  songsSortBySelector,
  sortedAndFilteredArtists,
  artistsSortBySelector,
  sortedAndFilteredAlbums,
  albumsSortBySelector,
} from '../../store/library/reducer'
import { playTrack, addToQueueNext } from '../../store/player/actions'
import { activeTrackSelector } from '../../store/player/reducer'
import { isResizeObserverSupported } from '../../lib/supported'
import styles, { addToPlaylistDialogStyles } from './library-view-styles'

import '../grid-item'
import '../x-icon-button'
import '../x-select'
import '../x-dialog'
import '../virtual-list'

import * as LibraryActions from '../../store/library/actions'
import { openMenu } from '../../store/menu/actions'
import '../track-list-item'

@customElement('library-view')
export class LibraryView extends connect(store)(LitElement) {
  @property()
  selectedTab: number = 0

  @property()
  songsList: Track[] = []

  @property()
  songsSortBy: string = ''

  @property()
  artistsList: Artist[] = []

  @property()
  artistsSortBy: string = ''

  @property()
  albumsList: Album[] = []

  @property()
  albumsSortBy: string = ''

  @property()
  playlistsList: Playlist[] = []

  @property()
  searchTerm: string = ''

  @property()
  activeTrack?: Track

  @property()
  isAddToDialogOpen: boolean = false

  @property()
  reducedMotion: boolean = false

  @property()
  page: PageType = {
    category: '',
    subCategory: undefined,
    query: {},
  }

  @property()
  potentialPlaylistId?: number

  libraryPages = [
    {
      id: 'songs',
      icon: 'musicNote',
    }, {
      id: 'albums',
      icon: 'album',
    }, {
      id: 'artists',
      icon: 'artist',
    }, {
      id: 'playlists',
      icon: 'playlist',
    },
  ]

  @query('.backdrop')
  backdrop!: HTMLElement

  stateChanged(state: RootState) {
    const { page } = state.app
    const { category, subCategory } = page
    if (category === 'library') {
      this.searchTerm = searchTermSelector(state.library)

      this.songsList = sortedAndFilteredTracks(state.library)
      this.songsSortBy = songsSortBySelector(state.library)

      this.artistsList = sortedAndFilteredArtists(state.library)
      this.artistsSortBy = artistsSortBySelector(state.library)

      this.albumsList = sortedAndFilteredAlbums(state.library)
      this.albumsSortBy = albumsSortBySelector(state.library)

      this.activeTrack = activeTrackSelector(state.player)

      this.playlistsList = state.library.playlists.list

      this.isAddToDialogOpen = state.library.playlists.isAddToDialogOpen

      const animate = this.page.category === 'library'
      this.page = page
      this.reducedMotion = state.app.reducedMotion
      this.changeTab(this.libraryPages.findIndex(({ id }) => id === subCategory), animate)
    }
  }

  static styles = styles

  getSortOptions(category?: string) {
    switch (category) {
    case 'albums':
      return [
        { name: 'Name', type: 'name' },
        { name: 'Artist', type: 'artist' },
        { name: 'Year', type: 'year' },
        { name: 'Duration', type: 'duration' },
      ]
    case 'artists':
      return [
        { name: 'Name', type: 'name' },
        { name: 'Duration', type: 'duration' },
      ]
    default:
      return [
        { name: 'Name', type: 'name' },
        { name: 'Artist', type: 'artist' },
        { name: 'Album', type: 'album' },
        { name: 'Duration', type: 'duration' },
      ]
    }
  }

  render() {
    const emptyBannerTemplate = (show: boolean | number) => (!show ? html`
      <div id='empty-banner'>
        <div>There is nothing here. Import more music files here<a href='/settings'>Here</a></div>
      </div>` : html``)

    const tabsTemplate = this.libraryPages.map((page) => {
      const selected = page.id === this.page.subCategory
      return html`
      <x-icon-button
          class='tab-button'
          href=${`/library/${page.id}`}
          tabindex=1
          ?selected=${selected}
          .icon=${page.icon}>
          ${selected ? html`<div class='tab-button-text'>${page.id}</div>` : html``}
      </x-icon-button>`
    })

    return html`
    </x-icon-button>
    <h1 class='title'>Library</h1>

    <div class='tabs-button-container'>${tabsTemplate}</div>

    <div class='more-action'>
      <div id='sort-label'>Sort by:</div>
      <x-select
          tabindex='1'
          .selected=${this.getSortOptions(this.page.subCategory).findIndex(item => item.type === this.songsSortBy)}
          .items=${this.getSortOptions(this.page.subCategory).map(item => item.name)}
          @input=${({ detail }: CustomEvent) => store.dispatch(LibraryActions.sort(
              this.page.subCategory as string,
              this.getSortOptions(this.page.subCategory)[detail].type,
          ))}>
      </x-select>

      <input
          tabindex='1'
          id='search-box'
          placeholder='Search'
          value=${this.searchTerm}
          @input=${this.onSearchHandler}/>
      <x-icon-button id='search-button' .icon=${'search'}></x-icon-button>
      <x-icon-button  
          tabindex='1'
          href='/settings'
          .icon=${'moreVertical'}>
      </x-icon-button>
    </div>
    <div class='backdrop'>
      ${emptyBannerTemplate(this.songsList.length)}
      <virtual-list
          id='songs-tab'
          class='tab-page'
          .items=${this.songsList}
          .template=${(track: Track, index: number) => html`
            <track-list-item
              .track=${track}
              ?playing=${this.activeTrack === track}
              @click=${() => store.dispatch(playTrack(index, this.songsList))}
              @contextmenu=${(e: MouseEvent) => {
              const menuItems = [{
                name: 'Play',
                fn: () => store.dispatch(playTrack(index, this.songsList)),
              }, {
                name: 'Play next',
                fn: () => store.dispatch(addToQueueNext(track)),
              }, {
                name: 'Add to playlist',
                fn: () => store.dispatch(LibraryActions.openPlaylistDialog(track)),
              }, {
                name: 'Remove from library',
                fn: () => store.dispatch(LibraryActions.removeTrack(track)),
              }]
              const { x, y } = e
              store.dispatch(openMenu({ x, y }, menuItems))
            }}>
          </track-list-item>
          `}>
      </virtual-list>
      <div class='tab-page grid'>
        ${emptyBannerTemplate(this.albumsList.length)}
        ${this.albumsList.map(item => html`
            <grid-item
                .data=${item}
                href=${`/album/${item.id}`}>
            </grid-item>
        `)}
        </div>
        <div class='tab-page grid'>
          ${emptyBannerTemplate(this.artistsList.length)}
          ${this.artistsList.map(item => html`
              <grid-item
                  .data=${item}
                  href=${`/artist/${item.id}`}>
              </grid-item>
          `)}
        </div>
        <virtual-list
          id='playlists-tab'
          class='tab-page'
          .items=${this.playlistsList}
          .template=${(playlist: Playlist) => html`
            <li
              @click=${() => 'store.dispatch()'}
              @contextmenu=${(e: MouseEvent) => {
                if (playlist.id === 123456) {
                  return
                }
                const menuItems = [{
                  name: 'Remove playlist',
                  fn: () => store.dispatch(LibraryActions.removePlaylist(playlist.id)),
                }]
                const { x, y } = e
                store.dispatch(openMenu({ x, y }, menuItems))
              }}>
              <x-icon .icon=${playlist.icon}></x-icon>
              <a href=${`/playlist/${playlist.id}`}></a>
              ${playlist.name}
            </li>
          </track-list-item>
          `}>
      </virtual-list>
    </div>

    <x-dialog
        .open=${
          // TODO. Refactor is needed here.
          this.isAddToDialogOpen
        }
        .styles=${addToPlaylistDialogStyles}
        .template=${html`
          <h1>Add to playlist</h1>
          <div class='content'>
            <form id='new-playlist-container' @submit=${(e: Event) => {
              e.preventDefault()
              const target = e.composedPath()[0] as HTMLFormElement
              const input = target.querySelector('#new-playlist-input') as HTMLInputElement
              const name = input.value.trim()
              if (name !== '') {
                store.dispatch(LibraryActions.createNewPlaylist(name))
                input.value = ''
              }
            }}>
              <input id='new-playlist-input' placeholder='Type new Playlist name here'/>
              <button
                  @click=${() => ''}
                  elevated
                  id='new-playlist-button'>
                Create new Playlist
              </button>
            </form>
            <ul>
            ${this.playlistsList.map(playlist => html`
              <li
                  @click=${() => { this.potentialPlaylistId = playlist.id }}
                  ?selected=${this.potentialPlaylistId === playlist.id}>
                <x-icon .icon=${playlist.icon}></x-icon>
                ${playlist.name}
              </li>`)
            }
            </ul>
          </div>
          <div class='dialog-bottom-bar'>
            <button @click=${() => store.dispatch(LibraryActions.closePlaylistDialog())}>Cancel</button>
            <button @click=${() => {
              if (this.potentialPlaylistId) {
                store.dispatch(LibraryActions.addToPlaylist(this.potentialPlaylistId))
                this.potentialPlaylistId = undefined
              }
            }}>
              Add
            </button>
          </div>
          `}>
    </x-dialog>
    `
  }

  firstUpdated() {
    if (isResizeObserverSupported) {
      const tabsRO = new window.ResizeObserver(() => {
        this.backdrop.scrollLeft = this.getCurrentTabScrollPos()
      })
      tabsRO.observe(this.backdrop)
    }
  }

  changeTab(newValue: number, animate?: boolean) {
    const oldValue = this.selectedTab
    this.selectedTab = newValue
    if (this.backdrop && newValue !== oldValue) {
      if (animate && !this.reducedMotion) {
        animateScrollTo(this.getCurrentTabScrollPos(), {
          speed: 200,
          minDuration: 100,
          element: this.backdrop,
          horizontal: true,
        })
      } else {
        this.backdrop.scrollLeft = this.getCurrentTabScrollPos()
      }
    }
  }

  getCurrentTabScrollPos(): number {
    if (this.backdrop) {
      const width = (this.backdrop.scrollWidth - 3 * 48) / 4
      return width * this.selectedTab + this.selectedTab * 48
    }
    return 0
  }

  @debounce(200, { leading: false })
  onSearchHandler() {
    const { value } = this.renderRoot.querySelector('#search-box') as HTMLInputElement
    store.dispatch(LibraryActions.search(value))
  }
}
