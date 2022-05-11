import { RouteDefinition } from 'solid-app-router'
import { lazy } from 'solid-js'

const route: RouteDefinition = {
  path: '/settings',
  component: lazy(() => import('./settings')),
}

export default route
