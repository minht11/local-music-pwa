import { Router } from 'solid-app-router'
import { createApp } from 'solid-utils'
import { MusicImagesProvider } from './components/music-image/data-context'
import { MenuProvider } from './components/menu/menu'
import { RootStoresProvider } from './stores/stores'
import { ModalsProvider } from './components/modals/modals'
import { ErrorPage } from './pages/error/error'
import { App } from './pages/app/app'

// The supported browser features check file is very small,
// still in case if it doesn't load or loads late
// do not render app only if we explicitly know that browser is not supported.
// If app loads in unsupported browser because of race condition it's not a big deal.
if (window.isSupportedBrowser !== false) {
  createApp(App)
    .use(Router)
    .use(ErrorPage)
    .use(MusicImagesProvider)
    .use(RootStoresProvider)
    .use(ModalsProvider)
    .use(MenuProvider)
    .mount('body')
}
