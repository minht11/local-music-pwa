import { css } from 'lit-element'
import { scrollbarStyles, headingStyles, listItemStyles } from '../shared-styles'

const libraryViewStyles = css`
  :host {
    --grid-row-height: calc(100% - var(--player-offset));
    display: grid;
    grid-template-rows: 72px 1fr;
    grid-template-columns: 96px 1fr 1fr;
    grid-template-areas: '. title other' 'tab-controls backdrop backdrop' '. backdrop backdrop';
    align-items: center;
    box-sizing: border-box;
    padding-right: 24px;
    height: var(--grid-row-height);
    z-index: 0;
  }   
  .title {
    grid-area: title;
    margin-left: 24px;
  }
  .tabs-button-container {
    display: flex;
    flex-direction: column;
    color: var(--app-primary-text-color);
    font-size: 18px;
    margin: 0 auto;
    align-self: flex-start;
    grid-area: tab-controls;
  }
  .tab-button {
    margin: 8px;
  } 
  .tabs-button-container .tab-button:first-child {
    margin-top: 0;
  }
  .tab-button[selected]:hover,
  .tab-button[selected] {
    background: var(--app-accent-color);
  }
  .tab-button-text {
    display: none;
  }
    
  .more-action {
    display: flex;
    align-items: center;
    grid-area: other;
    height: 56px;
    margin-left: auto;
  }
  
  #search-box {
    -webkit-appearance: none;
    border: none;
    height: 40px;
    border: 2px solid var(--app-surface-2-color);
    background: transparent;
    box-sizing: border-box;
    border-radius: 24px;
    width: 260px;
    font-size: 14px;
    font-family: inherit;
    padding: 0 16px;
    color: var(--app-primary-text-color);
    outline: none;
    margin: 0 8px;
  }
  
  #search-box::-webkit-input-placeholder {
    color: var(--app-secondary-text-color);
  }
  #search-button {
    display: none;
  }
  
  .backdrop {
    display: flex;
    position: relative;
    border-radius: 24px 24px 0 0;
    grid-area: backdrop;
    margin: 0 auto;
    margin-right: 24px;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  .tab-page {
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
    top: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    border-radius: 24px 24px 0 0;
    background: var(--app-surface-1-color);
    transform-origin: bottom center;
    margin-right: 48px;
    overflow-y: auto;
    padding: 16px 0;
    max-width: 100vw;
  }
  .tab-page.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    grid-gap: 24px;
    padding: 24px;
  }
    
  @media (max-width: 900px) {
    :host {
      grid-template-rows: 72px 1fr;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-areas: 'title tab-controls other' 'backdrop backdrop backdrop';
      padding: 0;
    }
    .tabs-button-container {
      flex-direction: row;
      margin: auto;
    }
    .tabs-button-container .tab-button:first-child {
      margin-top: auto;
    }
    #search-box {
      display: none;
    }
    #search-button {
      display: flex;
    }
    .backdrop {
      width: 100vw;
      margin: 0;
    }
    .tab-button[selected] {
      width: 100px;
      border-radius: 40px;
      font-size: 14px;
    }
    .tab-button-text {
      display: block;
      margin-left: 8px;
    }
  }
  @media (max-width: 600px) {
    :host {
      grid-template-rows: 56px 56px  1fr;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-areas:
      'title other other'
      'tab-controls tab-controls tab-controls'
      'backdrop backdrop backdrop';
      padding: 0;
    }
    .tabs-button-container {
      width: 100%;
      padding: 0 24px;
      box-sizing: border-box;
      justify-content: center;
    }
    .tab-button {
      margin: 0 16px;
    }
  }
  #sort-label {
    font-size: 14px;
    flex-shrink: 0;
    margin-right: 16px;
  }
  li {
    display: flex;
    height: 40px;
    padding: 0 16px;
    align-items: center;
    color: var(--app-primary-text-color);
  }
  li x-icon {
    margin-right: 24px;
  }
  /** 
   * TODO. Find better solution.
   * Since virtual-list doesnt support placing content inside it yet
   * just place it on top of it.
   */
  #empty-banner {
    position: absolute;
    left: 0;
    right: 0;
    margin: 24px;
    z-index: 1;
  }`

export const addToPlaylistDialogStyles = [
  listItemStyles,
  css`
  .content {
    overflow: auto;
  }
  ul {
    padding: 16px 0;
  }
  li[selected] {
    border-left: 2px solid var(--app-accent-color);
    background: var(--app-divider-color);
    padding-left: 14px;
  }
  #new-playlist-container {
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-bottom: 1px solid var(--app-divider-color);
  }
  #new-playlist-container input {
    background: var(--app-divider-color);
    border: none;
    border-radius: 8px;
    height: 40px;
    color: var(--app-primary-text-color);
    box-sizing: border-box;
    margin-bottom: 8px;
    padding: 0 8px;
    outline: none;
  }
  input::placeholder {
    color: var(--app-secondary-text-color);
  }
  #new-playlist-button {
    background: var(--app-accent-color);
    color: #fff;
  }`,
]

export default [
  scrollbarStyles,
  headingStyles,
  listItemStyles,
  libraryViewStyles,
]
