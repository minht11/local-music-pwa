import { createEffect } from 'solid-js'
import { setElementVars } from '@vanilla-extract/dynamic'
import { registerServiceWorker } from '../../sw/register-sw'
import { useAudioPlayer } from '../../audio/create-audio-player'
import { usePlayerStore } from '../../stores/stores'
import { installGlobalRipple } from '../../helpers/ripple/install-global-ripple'
import { useDarkThemeEnabled } from '../../utils'
import { colorsTheme } from '~/styles/vars.css'
import * as styles from './app.css'
import { toast } from '~/components/toast/toast'

export const useSetupApp = (): void => {
  useAudioPlayer()

  const [playerState] = usePlayerStore()

  const isDarkTheme = useDarkThemeEnabled()

  const titlebarElement = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement

  createEffect(() => {
    const isDark = isDarkTheme()
    const argb = playerState.activeTrack?.primaryColor

    const doc = document.documentElement

    if (argb === undefined) {
      type EmptyTheme = {
        [key in keyof typeof colorsTheme]: string
      }

      const emptyTheme = Object.fromEntries(
        Object.entries(colorsTheme).map(([key]) => [key, '']),
      ) as EmptyTheme

      setElementVars(doc, colorsTheme, emptyTheme)
      return
    }

    import('~/helpers/app-theme').then((module) => {
      const scheme = module.getAppTheme(argb, isDark)
      setElementVars(doc, colorsTheme, scheme)
      titlebarElement.content = scheme.surface
    })
  })

  registerServiceWorker({
    onNeedRefresh(updateSW) {
      toast({
        message: 'An app update is available',
        duration: false,
        controls: [
          {
            title: 'Reload',
            action: () => {
              updateSW()
            },
          },
        ],
      })
    },
  })

  installGlobalRipple(styles.interactable)
}
