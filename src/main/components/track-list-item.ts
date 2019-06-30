import {
  LitElement,
  html,
  css,
  customElement,
  property,
} from 'lit-element'
import { nullToUnknown, formatTime } from '../utils/utils'
import { Track } from '../typings/interface'

@customElement('track-list-item')
export class TrackListItem extends LitElement {
  @property({ type: Boolean, reflect: true, attribute: 'show-track-index' })
  showTrackIndex = false

  @property()
  track?: Track

  static get styles() {
    return [
      css`
      :host {
        display: grid;
        grid-template-rows: 1fr;
        grid-template-columns: 2fr 2fr 56px;
        grid-template-areas: 'content-1 content-2 content-3';
        grid-column-gap: 8px;
        justify-content: space-around;
        align-items: center;
        height: 48px;
        width: 100%;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
        color: var(--app-secondary-text-color);
        contain: content;
        transition: background 0.2s;
        cursor: pointer;
        box-sizing: border-box;
        padding: 0 24px;
      }
      :host([playing]) {
        padding-left: 22px;
        border-left: 2px solid var(--app-accent-color);
        background-color: rgba(255, 255, 255, 0.05);
        color: var(--app-accent-color);
      }
      :host([playing]) [title] {
        color: var(--accent-color);
      }
      :host([no0]) {
        grid-template-columns: 0 2fr 1fr 1fr 72px;
      }
      :host(:hover) {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .text-content {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        font-size: 14px;
      }
      .content-0 {
        grid-area: content-0;
        margin: auto;
      }
      .content-1 {
        color: var(--app-primary-text-color);
        font-size: 16px;
        grid-area: content-1;
      }
      .content-2 {
        display: flex;
        grid-area: content-2;
      }
      .content-2-item {
        width: 100%;
      }
      #content-2-item-separator {
        opacity: 0;
      }
      .content-3 {
        grid-area: content-3;
        justify-self: flex-end;
      }
      @media only screen and (max-width: 600px) {
        :host {
          height: 72px;
          grid-template-rows: 1fr 1fr;
          grid-template-areas: 
          'content-1 content-1 content-3'
          'content-2 content-2 content-3';
        }
        .content-1 {
          align-self: flex-end;
        }
        .content-2 {
          align-self: flex-start;
        }
        .content-2-item {
          width: initial;
          margin: 0;
        }
        #content-2-item-separator {
          opacity: 1;
          margin: 0 4px;
        }
      }
      @media only screen and (max-width: 256px) {
        :host {
          grid-template-areas: 
          'content-1 content-1 content-1'
          'content-2 content-2 content-2';
        }
        .content-3 {
          display: none;
        }
      }
      `,
    ]
  }

  render() {
    if (this.track) {
      const trackno = this.showTrackIndex && this.track.track && this.track.track.no
        ? html`<div class='content-0'>${this.track.track.no}</div>` : html``

      return html`
        ${trackno}
        <div class='text-content content-1' title>${nullToUnknown(this.track.name)}</div>
        <div class='text-content content-2'>
          <div class='text-content content-2-item'>${nullToUnknown(this.track.artist)}</div>
          <div id='content-2-item-separator'>|</div>
          <div class='text-content content-2-item'>${nullToUnknown(this.track.album)}</div>
        </div>
        <div class='text-content content-3'>${formatTime(this.track.duration)}</div>
      `
    }
    return html``
  }
}
