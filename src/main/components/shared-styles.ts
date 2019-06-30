import { css } from 'lit-element'

export const listItemStyles = css`
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    -webkit-appearance: none;
    -moz-appearance: none;
    -ms-appearance: none;
    appearance: none;
    outline: none;
    line-height: 40px;
    height: 40px;
    padding: 0 16px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
    transition: background .14s;
    color: var(--app-primary-text-color);
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
  }
  li:hover{
    background: var(--app-surface-3-color);
  }
  li[selected]{
    color: var(--app-accent-color);
  }
  li x-icon {
    margin-right: 24px;
  }
  li a {
    width: 100%;
    position: absolute;
    height: 100%;
    opacity: 0;
  }`

export const headingStyles = css`
  h1 {
    color: var(--app-primary-text-color);
    font-family: 'Quicksand', sans-serif;
    font-size: 27px;
    letter-spacing: 1px;
  }
  @media (max-width: 700px) {
    h1 {
      font-size: 22px;
    }
  }
  @media (max-width: 500px) {
    h1 {
      font-size: 17px;
    }
  }`

export const buttonStyles = css`
  button {
    -ms-appearance: none;
    -moz-appearance: none;
    -webkit-appearance: none;
    appearance: none;
    border: none;
    height: 40px;
    background: transparent;
    color: var(--app-primary-text-color);
    padding: 0 8px;
    font-size: 14px;
    border-radius: 8px;
    outline: none;
    transition: background 0.2s;
    cursor: pointer;
  }
  button[elevated] {
    background: var(--app-surface-1-color);
  }
  button:hover {
    background: rgba(140, 140, 140);
  }`

export const scrollbarStyles = css`
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }    
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, .4);
    border-radius: 2px;
  }`
