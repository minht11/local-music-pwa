import { lazy } from 'solid-js'
import { RouteDefinition } from 'solid-app-router'

const route: RouteDefinition = {
  path: '/search',
  component: lazy(() => import('./search')),
  children: [{ path: '/' }, { path: '/:searchTerm' }],
}

export default route
