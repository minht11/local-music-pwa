import {
  LitElement,
  html,
  css,
  customElement,
  property,
} from 'lit-element'
import { getImageUrl, nullToUnknown } from '../utils/utils'

import { Album } from '../typings/interface'

@customElement('grid-item')
export default class GridItem extends LitElement {
  // TODO. Add artist type here too.
  @property()
  data?: Album

  @property()
  href: string = ''

  static styles = css`
    :host {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border-radius: 8px;
      width: 100%;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.07);
      height: fit-content;
      position: relative;
    }
    :host(:hover) {
      background-color: rgba(255, 255, 255, 0.1);
    }
    [title] {
      color: #fff;
      font-size: 16px;
    }
    .img {
      padding-left: 100%;
      padding-top: 100%;
      background-size: cover;
      background-color: rgba(255, 255, 255, 0.2);
      grid-area: img;
      border-radius: 8px;
    }
    .info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 16px;
      height: 72px;
    }
    .info * {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    a {
      width: 100%;
      position: absolute;
      height: 100%;
      opacity: 0;
    }`

  render() {
    const link = this.href !== '' || this.href ? html`<a href=${this.href}></a>` : html``
    const content = this.data ? html`
      <div title>${nullToUnknown(this.data.name)}</div>
      <div>${this.data.artist ? this.data.artist.join(',') : ''}</div>
    ` : html``

    return html`
      ${link}
      <div
          class='content-0 img'
          style=${`background-image: url(${this.data ? getImageUrl(this.data) : ''})`}>
      </div>
      <div class="info">
        ${content}
      </div>
    `
  }
}
