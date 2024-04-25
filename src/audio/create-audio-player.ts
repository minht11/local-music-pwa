import {
  createEffect,
  useContext,
  createResource,
  untrack,
  onCleanup,
  createComputed,
  batch,
} from 'solid-js'
import { usePlayerStore } from '../stores/stores'
import { RepeatState } from '../stores/player/create-player-store'
import { isEventMeantForTextInput } from '../utils'
import { KeyboardCode } from '../utils/key-codes'
import { MusicImagesContext } from '../components/music-image/data-context'
import { toast } from '~/components/toast/toast'

const toastPlayerError = () => {
  toast({
    message: "Something went wrong. Player wasn't able to play selected track.",
    duration: false,
  })
}

export const useAudioPlayer = (): void => {
  const audio = new Audio()

  const [playerState, playerActions] = usePlayerStore()

  const activeTrack = () => playerState.activeTrack

  const [
    trackAudioFile,
    { refetch: refetchTrackAudioFile, mutate: mutateTrackAudioFile },
  ] = createResource(activeTrack, async (track) => {
    const fileWrapper = track?.fileWrapper

    if (!fileWrapper) {
      return undefined
    }

    if (fileWrapper.type === 'file') {
      return fileWrapper.file
    }

    const fileRef = fileWrapper.file

    let mode = await fileRef.queryPermission({ mode: 'read' })
    if (mode !== 'granted') {
      try {
        // Try to request permission if it's not denied.
        if (mode === 'prompt') {
          mode = await fileRef.requestPermission({ mode: 'read' })
        }
      } catch {
        // User activation is required to request permission. Catch the error.
      }

      if (mode !== 'granted') {
        return null
      }
    }

    return fileRef.getFile()
  })

  // createResource doesn't fetch when fetcher retuns undefined or null
  // so if active track doesn't exist anymore force stop the player.
  createComputed(() => {
    if (activeTrack() === undefined) {
      mutateTrackAudioFile(undefined)
      playerActions.pause()
    }
  })

  createEffect(() => {
    const { isPlaying } = playerState
    const audioFile = trackAudioFile()

    if (trackAudioFile.loading) {
      const previousAudioSrc = audio.src
      if (previousAudioSrc) {
        audio.src = ''
        // Setting src = '', changes src to site href address,
        // fully reset src by removing attribute itself.
        audio.removeAttribute('src')
        URL.revokeObjectURL(previousAudioSrc)
      }

      return
    }

    if (!isPlaying) {
      audio.pause()
      return
    }

    // File permission was denied.
    if (audioFile === null) {
      // Set undefined so we can request file again later.
      mutateTrackAudioFile(undefined)
      playerActions.pause()

      toast({
        message: 'To play selected track please grant requested permission first.',
        duration: false,
      })
    
      return
    }

    if (audioFile === undefined) {
      refetchTrackAudioFile()
      return
    }

    try {
      if (!audio.src) {
        audio.src = URL.createObjectURL(audioFile)
      }
      // TODO: When active track is changed very rapidly this error occurs:
      // 'The play() request was interrupted by a new load request.'
      audio.play()
    } catch (err) {
      console.error(err)

      playerActions.pause()
      toastPlayerError()
    }
  })

  audio.onerror = (err) => {
    console.error(err)
    batch(() => {
      playerActions.pause()
      toastPlayerError()
    })
  }

  createEffect(() => {
    if (playerState.currentTimeChanged) {
      audio.currentTime = untrack(() => playerState.currentTime)
    }
  })

  audio.ondurationchange = () => {
    playerActions.setDuration(audio.duration)
  }
  audio.ontimeupdate = () => {
    playerActions.setCurrentTime(audio.currentTime)
  }

  audio.onended = () => {
    const { repeat } = playerState
    if (repeat !== RepeatState.ONCE) {
      playerActions.playNextTrack(repeat === RepeatState.OFF)
    }
  }

  createEffect(() => {
    const k = 0.5 //value for adjusting the curve
    audio.volume = Math.pow(playerState.volume / 100, k)
    audio.muted = playerState.isMuted
    audio.loop = playerState.repeat === RepeatState.ONCE
  })

  document.addEventListener('keydown', (e) => {
    if (isEventMeantForTextInput(e)) {
      return
    }

    const { shiftKey } = e

    switch (e.code) {
      case KeyboardCode.SPACE:
        playerActions.playPause()
        break
      case KeyboardCode.M:
        playerActions.toggleMute()
        break
      case KeyboardCode.N:
        if (shiftKey) {
          playerActions.playNextTrack()
          break
        }
        return
      case KeyboardCode.P:
        if (shiftKey) {
          playerActions.playPreveousTrack()
          break
        }
        return
      default:
        return
    }

    e.preventDefault()
  })

  const ms = window.navigator.mediaSession
  if (ms) {
    const musicImages = useContext(MusicImagesContext)
    const imageKey = Symbol('key')

    createEffect(() => {
      const track = activeTrack()
      if (!track) {
        ms.metadata = null
        return
      }

      const { image } = track
      const newImageSrc = (image && musicImages?.get(image, imageKey)) || ''

      ms.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artists?.join(', '),
        album: track.album,
        artwork: [
          // TODO. This does not work with empty artwork, because it is svg in dom,
          // but maybe that's fine?
          { src: newImageSrc, sizes: '512x512', type: 'image/png' },
        ],
      })

      onCleanup(() => {
        if (image) {
          musicImages?.release(image, imageKey)
        }
      })
    })

    // Done for minification purposes.
    const setActionHandler = ms.setActionHandler.bind(ms)
    setActionHandler('play', playerActions.play)
    setActionHandler('pause', playerActions.pause)
    setActionHandler('previoustrack', playerActions.playPreveousTrack)
    setActionHandler('nexttrack', () => playerActions.playNextTrack())
    setActionHandler('seekbackward', () => {
      audio.currentTime = Math.max(audio.currentTime - 10, 0)
    })
    setActionHandler('seekforward', () => {
      audio.currentTime = Math.max(audio.currentTime - 10, 0)
    })
  }
}
