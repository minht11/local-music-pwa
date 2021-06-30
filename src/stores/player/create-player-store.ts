import { batch, createEffect, createMemo, untrack } from 'solid-js'
import { produce, createStore } from 'solid-js/store'

import { shuffleArray } from '../../utils/utils'
import { Track } from '../../types/types'
import { useToast } from '../../components/toasts/toasts'
import { useEntitiesStore } from '../stores'

export enum RepeatState {
  repeatOff = 0,
  repeatAll = 1,
  repeatOnce = 2,
}

interface State {
  isPlaying: boolean
  trackIds: string[]
  // Used to store tracks in original order
  // when shuffle is on.
  originalTrackIds: string[]
  // Currently playing audio track.
  activeTrackIndex: number
  repeat: RepeatState
  shuffle: boolean
  currentTime: number
  currentTimeChanged: boolean
  duration: number
  isMuted: boolean
  volume: number
  readonly activeTrackId: string
  readonly activeTrack?: Track
}

type TrackIds = readonly string[]

export const createPlayerStore = () => {
  const [entities] = useEntitiesStore()

  let isStateInitialized = false
  const [state, setState] = createStore<State>({
    isPlaying: false,
    trackIds: [],
    originalTrackIds: [],
    activeTrackIndex: -1,
    repeat: RepeatState.repeatOff,
    shuffle: false,
    currentTime: 0,
    currentTimeChanged: false,
    duration: 0,
    isMuted: false,
    volume: 100,
    get activeTrackId(): string {
      if (isStateInitialized) {
        // eslint-disable-next-line no-use-before-define
        return activeTrackIdMemo()
      }
      return ''
    },
    get activeTrack(): Track | undefined {
      if (isStateInitialized) {
        // eslint-disable-next-line no-use-before-define
        return activeTrackMemo()
      }
      return undefined
    },
  })
  isStateInitialized = true
  // If state is modified inside batch memo won't run until batch is exited,
  // so offer these selectors directly for functions that need it.
  const activeTrackIdSelector = () => state.trackIds[state.activeTrackIndex]
  const activeTrackSelector = () => entities.tracks[activeTrackIdSelector()]

  const activeTrackIdMemo = createMemo(activeTrackIdSelector)
  const activeTrackMemo = createMemo(activeTrackSelector)

  const doesActiveTrackExist = () => !!state.activeTrack

  const play = () => {
    setState({
      isPlaying: doesActiveTrackExist(),
    })
  }

  const pause = () => {
    setState({ isPlaying: false })
  }

  const playPause = () => {
    setState({
      // Player can only be playing if active track exists.
      isPlaying: !state.isPlaying && doesActiveTrackExist(),
    })
  }

  const setShuffleEnabledTracksState = () => {
    setState({
      // Save original tracks order, so we can restore them
      // if shuffle is turned off.
      originalTrackIds: state.trackIds,
      // Shuffle track ids and make active track first element.
      trackIds: shuffleArray(state.trackIds, state.activeTrackIndex),
      // Selected track in shuffled array is first.
      activeTrackIndex: 0,
    })
  }

  const playTrack = (index: number, tracks?: TrackIds) => {
    batch(() => {
      setState({
        currentTime: 0,
        currentTimeChanged: true,
        activeTrackIndex: index,
      })

      if (tracks) {
        setState({
          trackIds: [...tracks],
        })

        if (state.shuffle) {
          setShuffleEnabledTracksState()
        }
      }

      // Set isPlaying to true if track exists.

      // state.activeTrack is a memo and not a state property internally,
      // because of batch memo didn't change yet so use selector directly.
      setState('isPlaying', !!activeTrackSelector())
    })
  }

  const playNextTrack = (playUnlessLastTrack = false) => {
    const { trackIds, activeTrackIndex } = state
    const len = trackIds.length

    if (!len) {
      return
    }

    // If the queue has tracks but not an activeTrack
    // play the first track instead.
    if (activeTrackIndex === -1) {
      playTrack(0)
      return
    }

    const isTheLastTrack = len === activeTrackIndex + 1
    // If queue has reached the end and can't start from the beginning.
    if (isTheLastTrack && playUnlessLastTrack) {
      setState({ isPlaying: false })
      return
    }

    // Play next track or start from the beginning.
    const newIndex = isTheLastTrack ? 0 : activeTrackIndex + 1
    playTrack(newIndex)
  }

  const playPreveousTrack = () => {
    const { trackIds, activeTrackIndex } = state
    const len = trackIds.length

    if (!len) {
      return
    }

    let { currentTime } = state

    // If the queue has tracks but not an activeTrack
    // play the first track instead.
    let newIndex = activeTrackIndex
    if (newIndex === -1) {
      newIndex = 0

      // Play the same track from the beginning if more than
      // 4 secconds had passed.
    } else if (currentTime < 4) {
      newIndex = activeTrackIndex === 0 ? len - 1 : activeTrackIndex - 1
      currentTime = 0
    }

    playTrack(newIndex)
  }

  const addTracksToQueue = (trackIds: TrackIds) => {
    // Merge old queue items with new ones.
    setState(
      produce((s: State) => {
        let newTrackIds = trackIds

        if (s.shuffle) {
          newTrackIds = shuffleArray(trackIds)
          s.originalTrackIds = s.originalTrackIds.concat(trackIds)
        }

        s.trackIds = s.trackIds.concat(newTrackIds)
      }),
    )
  }

  const removeFromQueue = (trackIdsToBeRemoved: TrackIds) => {
    let { trackIds, originalTrackIds, activeTrackIndex: activeIndex } = state

    trackIds = trackIds.filter((id) => !trackIdsToBeRemoved.includes(id))
    if (state.shuffle) {
      // If shuffle is on tracks also need to be removed from cached tracks.
      originalTrackIds = originalTrackIds.filter(
        (id) => !trackIdsToBeRemoved.includes(id),
      )
    }

    // After removing tracks from the queue activeTrack index might have shifted.
    activeIndex = originalTrackIds.indexOf(state.activeTrackId)

    let stateIfTrackGotRemoved = {}
    // Track got removed.
    if (activeIndex === -1) {
      stateIfTrackGotRemoved = {
        isPlaying: false,
        currentTime: 0,
        duration: NaN,
      }
    }

    setState({
      ...stateIfTrackGotRemoved,
      trackIds,
      originalTrackIds,
      activeTrackIndex: activeIndex,
    })
  }

  const clearQueue = () => {
    setState({
      tracks: [],
      originalTracks: [],
      isPlaying: false,
      currentTime: 0,
      duration: NaN,
    })
  }

  const toggleShuffle = () => {
    let { shuffle } = state

    // Toggle between states.
    shuffle = !shuffle

    batch(() => {
      if (shuffle) {
        setShuffleEnabledTracksState()
      } else {
        const { originalTrackIds } = state

        setState({
          // Track itself didn't change just its position after shuffle
          // inside queue so find new index of it.
          activeTrackIndex: originalTrackIds.indexOf(state.activeTrackId),
          // Restore original positions.
          trackIds: originalTrackIds,
          // Remove original tracks because they are only
          // stored when shuffling is enabled.
          originalTrackIds: [],
        })
      }
      setState('shuffle', shuffle)
    })
  }

  const toggleRepeat = () => {
    // Cycle between states 0, 1, 2, 0, 1...
    const repeatMap = {
      [RepeatState.repeatOff]: RepeatState.repeatAll,
      [RepeatState.repeatAll]: RepeatState.repeatOnce,
      [RepeatState.repeatOnce]: RepeatState.repeatOff,
    }

    setState({ repeat: repeatMap[state.repeat] })
  }

  const setCurrentTime = (payload: number) => {
    setState({
      currentTimeChanged: false,
      currentTime: payload,
    })
  }

  const changeCurrentTime = (payload: number) => {
    setState({
      currentTime: payload,
      currentTimeChanged: true,
    })
  }

  const setDuration = (duration: number) => {
    setState({ duration })
  }

  const setVolume = (volume: number) => {
    setState({
      volume,
      isMuted: false,
    })
  }

  const toggleMute = () => {
    let { volume, isMuted } = state
    isMuted = !isMuted

    if (!isMuted && volume < 10) {
      volume = 10
    }
    setState({ volume, isMuted })
  }

  const toasts = useToast()

  const addToQueue = (trackIds: TrackIds) => {
    addTracksToQueue(trackIds)
    toasts.show({
      id: 'player-added-tracks-to-queue',
      message: 'Added selected tracks to queue',
      duration: 4000,
    })
  }

  createEffect(() => {
    const { tracks } = entities
    untrack(() => {
      const { activeTrackId } = state

      const filterIds = (trackIdsInQueue: readonly string[]) =>
        trackIdsInQueue.filter((trackId) => tracks[trackId])

      setState('trackIds', filterIds)
      setState('originalTrackIds', filterIds)
      // Active track index might have changed if some tracks were removed.
      setState('activeTrackIndex', state.trackIds.indexOf(activeTrackId))
    })
  })

  const actions = {
    play,
    pause,
    playPause,
    playTrack,
    playNextTrack,
    playPreveousTrack,
    addTracksToQueue,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    toggleMute,
    toggleRepeat,
    setCurrentTime,
    changeCurrentTime,
    setDuration,
    setVolume,
    addToQueue,
  }

  const persistedItems = [
    {
      key: 'player-volume',
      selector: () => state.volume,
      load: (volume: number) => setState({ volume }),
    },
    {
      key: 'player-is-muted',
      selector: () => state.isMuted,
      load: (isMuted: boolean) => setState({ isMuted }),
    },
    {
      key: 'player-shuffle',
      selector: () => state.shuffle,
      load: (shuffle: State['shuffle']) => setState({ shuffle }),
    },
    {
      key: 'player-repeat',
      selector: () => state.repeat,
      load: (repeat: State['repeat']) => setState({ repeat }),
    },
  ]

  return [state, actions, persistedItems] as const
}
