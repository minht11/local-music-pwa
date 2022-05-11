import { RouteDefinition } from 'solid-app-router'
import { CONFIG, LIBRARY_PATH, DEFAULT_LIBRARY_PATH } from './config'
import { LibraryPage } from './library-tab'
import Library from './library'

export { LIBRARY_PATH, DEFAULT_LIBRARY_PATH }

const libraryRoutes: RouteDefinition[] = CONFIG.map((page) => ({
  path: page.path,
  component: () => <LibraryPage {...page} />,
}))

const route: RouteDefinition = {
  path: '/library',
  // Library is a focal point of this app.
  // Most people will land on this page.
  // There isn't much to be gained loading it lazily.
  component: Library,
  children: libraryRoutes,
}

export default route
