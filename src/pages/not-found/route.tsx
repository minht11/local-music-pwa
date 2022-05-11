import { RouteDefinition } from 'solid-app-router'
import { lazy } from 'solid-js'

const route: RouteDefinition = {
  path: '/*all',
  component: lazy(() => import('./not-found')),
}

export default route
