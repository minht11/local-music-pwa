import { RouteDefinition } from 'solid-app-router'
import { lazy } from 'solid-js'

const route: RouteDefinition = {
  path: '/about',
  component: lazy(() => import('./about')),
}

export default route
