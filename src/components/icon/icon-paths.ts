export const IconType = {
  BACK_ARROW: 0,
  PLAY: 1,
  MUSIC_NOTE: 2,
  ALBUM: 3,
  PERSON: 4,
  PLAYLIST: 5,
  CHEVRON_DOWN: 6,
  CHEVRON_UP: 7,
  SEARCH: 8,
  ADD_PLAYLIST: 9,
  CLOSE: 10,
  EDIT: 11,
  DELETE: 12,
  MORE_VERTICAL: 13,
  FAVORITE: 14,
  FAVORITE_OUTLINE: 15,
  SORT: 16,
  PICTURE_IN_PICTURE: 17,
  PLUS: 18,
  PLAYLIST_PLAY: 19,
} as const

export type IconType = typeof IconType[keyof typeof IconType]

// Icons taken from https://materialdesignicons.com/
// and then minified.
export const ICON_PATHS = {
  [IconType.BACK_ARROW]:
    'M20 11v2H8l5.5 5.5-1.42 1.42L4.16 12l7.92-7.92L13.5 5.5 8 11h12z',
  [IconType.PLAY]: 'M8 5.14v14l11-7-11-7z',
  [IconType.MUSIC_NOTE]:
    'M12 3v9.26c-.5-.17-1-.26-1.5-.26C8 12 6 14 6 16.5S8 21 10.5 21s4.5-2 4.5-4.5V6h4V3h-7z',
  [IconType.ALBUM]:
    'M12 11a1 1 0 00-1 1 1 1 0 001 1 1 1 0 001-1 1 1 0 00-1-1m0 5.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5M12 2A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z',
  [IconType.PLAYLIST]:
    'M15 6H3v2h12V6m0 4H3v2h12v-2M3 16h8v-2H3v2M17 6v8.18c-.31-.11-.65-.18-1-.18a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V8h3V6h-5z',
  [IconType.CHEVRON_DOWN]:
    'M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6 1.41-1.42z',
  [IconType.CHEVRON_UP]:
    'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z',
  [IconType.SEARCH]:
    'M9.5 3A6.5 6.5 0 0116 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27C12.59 15.41 11.11 16 9.5 16A6.5 6.5 0 013 9.5 6.5 6.5 0 019.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z',
  [IconType.ADD_PLAYLIST]:
    'M2 16h8v-2H2m16 0v-4h-2v4h-4v2h4v4h2v-4h4v-2m-8-8H2v2h12m0 2H2v2h12v-2z',
  [IconType.CLOSE]:
    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z',
  [IconType.EDIT]:
    'M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z',
  [IconType.DELETE]:
    'M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z',
  [IconType.MORE_VERTICAL]:
    'M12 16a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m0-6a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m0-6a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2z',
  [IconType.FAVORITE]:
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53L12 21.35z',
  [IconType.FAVORITE_OUTLINE]:
    'M12.1,18.55L12,18.65L11.89,18.55C7.14,14.24 4,11.39 4,8.5C4,6.5 5.5,5 7.5,5C9.04,5 10.54,6 11.07,7.36H12.93C13.46,6 14.96,5 16.5,5C18.5,5 20,6.5 20,8.5C20,11.39 16.86,14.24 12.1,18.55M16.5,3C14.76,3 13.09,3.81 12,5.08C10.91,3.81 9.24,3 7.5,3C4.42,3 2,5.41 2,8.5C2,12.27 5.4,15.36 10.55,20.03L12,21.35L13.45,20.03C18.6,15.36 22,12.27 22,8.5C22,5.41 19.58,3 16.5,3Z',
  [IconType.SORT]: 'M3 13h12v-2H3m0-5v2h18V6M3 18h6v-2H3v2z',
  [IconType.PERSON]:
    'M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z',
  [IconType.PICTURE_IN_PICTURE]:
    'M19 11h-8v6h8v-6m4 8V5c0-1.12-.9-2-2-2H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2m-2 0H3V4.97h18V19z',
  [IconType.PLUS]: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  [IconType.PLAYLIST_PLAY]:
    'M19,9H2V11H19V9M19,5H2V7H19V5M2,15H15V13H2V15M17,13V19L22,16L17,13Z',
}
