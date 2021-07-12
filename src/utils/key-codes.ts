export const KeyboardCode = {
  ENTER: 'Enter',
  ESC: 'Escape',
  SPACE: 'Space',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_UP: 'ArrowUp',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_DOWN: 'ArrowDown',
  P: 'KeyP',
  N: 'KeyN',
  M: 'KeyM',
  T: 'KeyT',
}
export type KeyboardCode = typeof KeyboardCode[keyof typeof KeyboardCode]
