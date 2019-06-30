import { ICON_PATHS, IconType } from '../shared/x-icon-paths'

class IconPainter {
  static get inputProperties() {
    return [
      '--x-icon',
      '--x-icon-color',
      '--x-icon-size',
    ]
  }

  paint(
    ctx: CanvasRenderingContext2D,
    geom: { width: number, height: number },
    properties: StylePropertyMapReadOnly,
  ) {
    // @ts-ignore
    const iconName = properties.get('--x-icon').toString() as IconType
    // @ts-ignore
    const color = properties.get('--x-icon-color').toString()
    const path = ICON_PATHS[iconName]

    ctx.fillStyle = color

    const p = new Path2D(path)
    ctx.fill(p)
  }
}

// @ts-ignore
registerPaint('x-icon-painter', IconPainter)
