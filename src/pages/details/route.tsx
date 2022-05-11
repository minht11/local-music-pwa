import { RouteDefinition } from 'solid-app-router'
import { lazy } from 'solid-js'
import { DETAILS_PAGES_CONFIG } from './config'

const DetailsPage = lazy(() => import('./details'))

const routes: RouteDefinition[] = DETAILS_PAGES_CONFIG.map((page) => ({
  path: `${page.path}/:itemId`,
  component: () => <DetailsPage {...page} />,
}))

export default routes
