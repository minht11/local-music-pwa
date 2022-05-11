import { CSSProperties, keyframes } from '@vanilla-extract/css'

export const createFromToKeyframes = (frames: CSSProperties) => {
  const cKeyframes = (time: string) =>
    keyframes({
      [time]: frames,
    })

  return [cKeyframes('from'), cKeyframes('to')] as const
}

// Direct copy from https://github.com/seek-oss/vanilla-extract/blob/cfb0c89b3f0a300eb58dbeb0ce3d9eb84a612844/packages/private/src/getVarName.ts#L1
export function getVarName(variable: string) {
  const matches = /^var\((.*)\)$/.exec(variable)

  if (matches) {
    return matches[1]
  }

  return variable
}
