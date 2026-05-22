# Gapless playback — implementation plan

## Starting point

Already done:

- `ParsedTrackData` has `metadataVersion?: number` and `format?: IFormat`
- `mainStore.gaplessPlaybackEnabled` setting toggle exists
- `CURRENT_METADATA_VERSION` constant and scanner populated (Phase 1 complete)
- Mediabunny installed

## Mediabunny API reference (correct names)

```typescript
import { Input, FLAC, BlobSource, AudioBufferSink } from 'mediabunny'

// Create input from a File object
const input = new Input({ formats: [FLAC], source: new BlobSource(file) })

// Get audio track
const audioTrack = await input.getPrimaryAudioTrack()

// Stream decoded AudioBuffer objects with their timestamps
const sink = new AudioBufferSink(audioTrack)
for await (const { buffer, timestamp } of sink.buffers()) {
  // buffer: AudioBuffer (Web Audio API), timestamp: seconds from track start
  // Schedule on AudioContext:
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.start(scheduleBase + timestamp)
}

// Seek — pass start time in seconds to buffers():
for await (const { buffer, timestamp } of sink.buffers(seekTo)) { ... }

// Abort all ongoing reads and decode operations:
input.dispose()  // throws InputDisposedError to any awaiting code
```

`AudioBufferSink` handles decode internally. No `AudioDecoder`, no `AudioData`, no manual `copyTo`. `timestamp` is the buffer's offset from track start (always 0-based for FLAC), so `scheduleBase + timestamp` gives the correct `AudioContext` time.

---

## Phase 1 — Extract shared file-access helper

**Files:** new `src/lib/helpers/file-access.ts`, `src/lib/stores/player/audio-loader.svelte.ts`

`getTrackFile` and its three dependencies (`requestPermission`, `getTrackFileRegular`, `getTrackFileWorkaroundForAndroid`) are unexported module-level functions inside `audio-loader.svelte.ts`. The gapless loader needs the same logic.

Move all four functions into a new `file-access.ts` and export `getTrackFile`. Update `audio-loader.svelte.ts` to import from it. No behaviour change.

**Acceptance:** Existing playback still works.

---

## Phase 2 — Extend `EqualizerStore`

**File:** `src/lib/stores/player/equalizer.svelte.ts`

The gapless loader creates `AudioBufferSourceNode`s that must connect into the same filter chain as the existing `MediaElementSource`. Add two public members:

```typescript
// Exposes the AudioContext, creating the audio graph if it doesn't exist yet.
get audioContext(): AudioContext {
  return this.#ensureAudioGraph()
}

// Connects a node into the filter chain at filter[0].
// The existing MediaElementSource stays connected; when the audio element has
// no src it is silent and causes no interference.
connectSource(node: AudioNode): void {
  this.#ensureAudioGraph()
  node.connect(this.#filters[0]!)
}
```

**Acceptance:** `connectSource(oscillatorNode)` makes the oscillator audible through the EQ.

---

## Phase 3 — Capability detection

**New file:** `src/lib/helpers/gapless/capability.ts`

```typescript
import type { TrackData } from '$lib/library/get/value-queries.ts'

// Mediabunny's AudioBufferSink requires WebCodecs AudioDecoder internally.
export const isGaplessSupported = (): boolean => 'AudioDecoder' in globalThis

// Only tracks with metadataVersion set and a supported codec are eligible.
// Start with FLAC; extend the set when adding more formats.
const SUPPORTED_CODECS = new Set(['FLAC'])

export const canTrackUseGapless = (track: TrackData): boolean =>
	(track.metadataVersion ?? 0) >= 1 &&
	track.format?.codec != null &&
	SUPPORTED_CODECS.has(track.format.codec)
```

**Acceptance:** Returns `true` for a freshly-scanned FLAC on Chrome/Firefox, `false` for old tracks, `false` for MP3.

---

## Phase 4 — Gapless loader

**New file:** `src/lib/stores/player/gapless-loader.svelte.ts`

### API

```typescript
export class GaplessLoader {
	loading: boolean = $state(false)

	constructor(private equalizer: EqualizerStore) {}

	// Stream and schedule a track. scheduleAt is the AudioContext time at which
	// this track should start; omit to start immediately.
	// Returns the AudioContext time at which this track ends (for chaining).
	load(
		directoryId: number,
		file: FileEntity,
		track: TrackData,
		scheduleAt?: number,
	): Promise<number>

	// Stop all scheduled nodes and cancel any ongoing streaming.
	abort(): void

	// Seek to a new position within the currently playing track.
	// Aborts current scheduling and re-schedules from seekTo seconds.
	seek(seekTo: number): Promise<void>
}
```

### Implementation notes

```typescript
async load(directoryId, fileEntity, track, scheduleAt) {
  this.abort()                        // clean up any previous load
  this.loading = true
  this.#aborted = false

  const fileResult = await getTrackFile(directoryId, fileEntity)
  if (fileResult.status !== 'loaded') { this.loading = false; return 0 }

  const ctx = this.equalizer.audioContext
  const base = scheduleAt ?? ctx.currentTime
  this.#scheduleBase = base
  this.#scheduleSeekOffset = 0        // reset for full-track loads

  this.#input = new Input({ formats: [FLAC], source: new BlobSource(fileResult.file) })
  const audioTrack = await this.#input.getPrimaryAudioTrack()
  const sink = new AudioBufferSink(audioTrack)

  this.loading = false

  let lastScheduledEnd = base

  try {
    for await (const { buffer, timestamp } of sink.buffers()) {
      if (this.#aborted) break

      const source = ctx.createBufferSource()
      source.buffer = buffer
      this.equalizer.connectSource(source)
      source.start(base + timestamp)
      this.#scheduledSources.push({ source, startAt: base + timestamp })

      lastScheduledEnd = base + timestamp + buffer.duration
    }
  } catch (e) {
    if (!(e instanceof InputDisposedError)) throw e
    // InputDisposedError means abort() was called — not an error
  }

  return lastScheduledEnd
}

abort(): void {
  this.#aborted = true
  this.#input?.dispose()              // cancels all pending reads and decoding
  this.#input = null

  const ctx = this.equalizer.audioContext
  const now = ctx.currentTime
  for (const { source, startAt } of this.#scheduledSources) {
    if (startAt > now) {
      source.stop()                   // cancel unstarted nodes
    } else {
      source.stop(now)                // stop nodes that are currently playing
    }
  }
  this.#scheduledSources = []
  this.loading = false
}

async seek(seekTo: number): Promise<void> {
  this.abort()
  if (!this.#lastFile || !this.#lastTrack) return

  this.#aborted = false
  const ctx = this.equalizer.audioContext
  const base = ctx.currentTime        // start playing from now
  this.#scheduleBase = base
  this.#scheduleSeekOffset = seekTo   // track where in the file we started

  this.#input = new Input({ formats: [FLAC], source: new BlobSource(this.#lastFile) })
  const audioTrack = await this.#input.getPrimaryAudioTrack()
  const sink = new AudioBufferSink(audioTrack)

  try {
    for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
      if (this.#aborted) break

      const source = ctx.createBufferSource()
      source.buffer = buffer
      this.equalizer.connectSource(source)
      // timestamp is absolute (from track start); offset by the seek point
      source.start(base + (timestamp - seekTo))
      this.#scheduledSources.push({ source, startAt: base + (timestamp - seekTo) })
    }
  } catch (e) {
    if (!(e instanceof InputDisposedError)) throw e
  }
}
```

**`currentTime` computation** — expose a getter read by the player:

```typescript
get currentTime(): number {
  const ctx = this.equalizer.audioContext
  const elapsed = ctx.currentTime - this.#scheduleBase
  return this.#scheduleSeekOffset + Math.max(0, elapsed)
}
```

The player writes this into its own `currentTime` field via a `requestAnimationFrame` loop.

**Pause/resume** — handled at the `PlayerStore` level via `equalizer.audioContext.suspend()` / `.resume()`. A suspended AudioContext freezes `audioContext.currentTime`, so all already-scheduled nodes remain valid and fire at the right time when the context resumes. This handles normal pause durations correctly. If the context is killed by the browser (e.g. backgrounded iOS tab), treat identically to the existing HTMLAudioElement path — the track loading `$effect` will re-run.

---

## Phase 5 — Player integration

**File:** `src/lib/stores/player/player.svelte.ts`

### New fields

```typescript
readonly #gaplessLoader = new GaplessLoader(this.equalizer)
#usingGapless: boolean = false                // set at track load time
#gaplessTrackEndTime: number = 0             // AudioContext time when current track ends
#preBufferingNext: boolean = false
```

### Track loading `$effect`

Add a gapless branch alongside the existing AudioLoader call. `#usingGapless` is determined once per track load from the setting at that moment:

```typescript
const useGapless =
	this.#main.gaplessPlaybackEnabled && isGaplessSupported() && canTrackUseGapless(track)

this.#usingGapless = useGapless

if (useGapless) {
	this.#audio.src = '' // silence the audio element
	this.#audioLoader.reset()
	this.#preBufferingNext = false
	this.loading = true

	void this.#gaplessLoader
		.load(track.directory, track.file, track)
		.then((endTime) => {
			this.#gaplessTrackEndTime = endTime
			this.loading = false
		})
		.catch(() => {
			// Fall back to AudioLoader on any error
			this.#usingGapless = false
			void this.#audioLoader.load(track.directory, track.file)
		})
} else {
	this.#gaplessLoader.abort()
	// ...existing AudioLoader path unchanged...
}
```

### `currentTime` — no renaming

Keep the existing `currentTime: number = $state(0)` field. In gapless mode, drive it from the gapless loader's getter via a `requestAnimationFrame` loop:

```typescript
#startCurrentTimeLoop(): void {
  const tick = () => {
    if (!this.#usingGapless) return
    this.currentTime = this.#gaplessLoader.currentTime
    this.#rafId = requestAnimationFrame(tick)
    this.#checkPreBuffer()           // also check pre-buffer threshold here
  }
  this.#rafId = requestAnimationFrame(tick)
}
```

Start the loop when a gapless track begins. Cancel it in `abort()`. In legacy mode, `audio.ontimeupdate` continues writing to `this.currentTime` exactly as before — same field, different writer.

`duration` similarly: in gapless mode, write `this.duration = track.format?.duration ?? 0` once at load time. In legacy mode, `audio.ondurationchange` continues writing it.

### `seek` override

```typescript
seek = (time: number): void => {
	this.currentTime = time
	if (this.#usingGapless) {
		this.#preBufferingNext = false
		void this.#gaplessLoader.seek(time)
	} else {
		this.#audio.currentTime = time
	}
}
```

### Pre-buffering the next track

Called from the rAF loop (`#checkPreBuffer`):

```typescript
const PRE_BUFFER_SECONDS = 10

#checkPreBuffer(): void {
  if (
    !this.#usingGapless ||
    !this.#main.gaplessPlaybackEnabled ||  // re-check in case toggled mid-play
    this.#preBufferingNext ||
    this.duration - this.currentTime >= PRE_BUFFER_SECONDS
  ) return

  this.#preBufferingNext = true

  const nextIndex = this.#queue.getNextIndex()
  if (nextIndex === -1) return           // end of queue

  const nextId = this.#queue.itemsIds[nextIndex]
  if (nextId == null) return

  // Query next track from DB using existing helpers
  void getTrackById(nextId).then(nextTrack => {
    if (!nextTrack) return

    if (canTrackUseGapless(nextTrack)) {
      // Schedule gaplessly: start exactly where current track ends
      void this.#gaplessLoader
        .load(nextTrack.directory, nextTrack.file, nextTrack, this.#gaplessTrackEndTime)
        .then((endTime) => {
          this.#gaplessTrackEndTime = endTime
          this.#preBufferingNext = false
        })

      // Advance the queue index at the right AudioContext moment (UI sync)
      const delay = (this.#gaplessTrackEndTime - this.equalizer.audioContext.currentTime) * 1000
      setTimeout(() => {
        this.#queue.setTrack(nextIndex)
      }, Math.max(0, delay))

    } else {
      // Next track is a non-gapless format (MP3, AAC, etc.) or has no metadata.
      // Let the current gapless track finish, then fall back to AudioLoader.
      const delay = (this.#gaplessTrackEndTime - this.equalizer.audioContext.currentTime) * 1000
      setTimeout(() => {
        this.#usingGapless = false
        this.#preBufferingNext = false
        this.#queue.setTrack(nextIndex)
        // The track loading $effect re-runs and picks the AudioLoader path.
      }, Math.max(0, delay))
    }
  })
}
```

---

## Edge cases

### Seeking to near the end

If the user seeks to within `PRE_BUFFER_SECONDS` of the end:

1. `seek(time)` calls `#gaplessLoader.seek(time)` which aborts current scheduling and resets `#preBufferingNext = false`
2. On the next rAF tick, `#checkPreBuffer` fires immediately because `duration - currentTime < PRE_BUFFER_SECONDS`
3. Pre-buffering starts for the next track — identical to the normal pre-buffer flow

No special handling needed.

### Track changed manually (user clicks a different track)

The track loading `$effect` re-runs when `activeTrack` changes:

- `this.#gaplessLoader.abort()` is called at the top of the effect (before the gapless branch), which calls `input.dispose()`, cancels all pending reads, and stops all scheduled nodes
- `#preBufferingNext = false` is reset
- The new track loads fresh

Note: the `setTimeout` queued for queue advancement of the previous next-track transition may fire after the manual track change. Guard against this by checking `this.#queue.activeTrackId` inside the timeout callback and bailing out if it no longer matches what was expected when the timeout was set.

### Sample rate mismatch between tracks

No special handling needed. `AudioBufferSink` always decodes at the source file's native sample rate. When an `AudioBuffer` with a different `sampleRate` than the `AudioContext` is played, the Web Audio API resamples it transparently. Duration math (`buffer.duration = numberOfFrames / sampleRate`) remains accurate regardless, so scheduling is correct.

### Different format between tracks (e.g. FLAC → MP3)

Handled by the `canTrackUseGapless(nextTrack)` check in `#checkPreBuffer`. If the next track's codec is not in `SUPPORTED_CODECS`, the fallback `setTimeout` path triggers: the current gapless track finishes playing, then the AudioLoader path takes over for the next track. There will be a small gap during AudioLoader startup — this is acceptable and expected when mixing formats.

### Gapless setting toggled off mid-play

`#usingGapless` is set at track load time and does not reactively update mid-track. The current track finishes gaplessly without interruption. The `#checkPreBuffer` guard (`!this.#main.gaplessPlaybackEnabled`) prevents starting a new gapless pre-buffer after the setting is turned off. When the current track's `setTimeout` fires and advances the queue, the track loading `$effect` re-runs, reads `gaplessPlaybackEnabled = false`, and picks the AudioLoader path for the next track.

If the user wants the change to take effect immediately (current track also switches to legacy): that requires aborting the gapless loader and reloading the current track via AudioLoader from `this.currentTime`. This is a higher-complexity path — only implement if explicitly requested; the "finish current track gaplessly" behavior is the better UX default.

---

## Files changed

```
src/lib/stores/player/audio-loader.svelte.ts          import getTrackFile from shared helper
src/lib/stores/player/equalizer.svelte.ts             add audioContext getter + connectSource()
src/lib/stores/player/player.svelte.ts                gapless branch, seek override, pre-buffer, rAF loop
```

```
src/lib/helpers/file-access.ts                        extracted getTrackFile + dependencies (new)
src/lib/helpers/gapless/capability.ts                 isGaplessSupported + canTrackUseGapless (new)
src/lib/stores/player/gapless-loader.svelte.ts        Mediabunny-based loader (new)
```

## Acceptance criteria

1. Toggle off → play FLAC → existing HTMLAudioElement path. No regression.
2. Toggle on → play FLAC scanned before the feature (`metadataVersion` undefined) → AudioLoader fallback silently.
3. Toggle on → play freshly-scanned FLAC → audio plays through gapless path.
4. Two consecutive FLACs from the same album rip → zero audible gap.
5. Seek to 5 seconds before end of a FLAC → pre-buffer fires immediately, next track plays gaplessly.
6. Seek to middle of FLAC → playback resumes from correct position, `currentTime` accurate.
7. Manually change track mid-play → previous scheduled nodes stop within one frame.
8. FLAC followed by MP3 → MP3 plays via AudioLoader after FLAC finishes (small gap acceptable).
9. Toggle setting off mid-album → current track finishes gaplessly, next track uses AudioLoader.
10. Pause for 5 seconds, resume → playback continues from correct position.

---

# Main changes from the previous plan:

API corrections — the Mediabunny docs revealed BlobSource (not FileSource), AudioBufferSink (not track.decode()), input.dispose() for abort, and input.getPrimaryAudioTrack(). The seek API is simply sink.buffers(seekTo) — no extra abstraction needed.
Naming — currentTime and duration stay as-is. In gapless mode the rAF loop writes to them; in legacy mode ontimeupdate/ondurationchange write to them. Same field, different driver.
Edge cases added:

Near-end seek — abort resets #preBufferingNext, next rAF tick triggers pre-buffer immediately. Works automatically.
Manual track change — abort() → input.dispose() cancels everything. Added a guard for the stale setTimeout.
Sample rate mismatch — Web Audio API resamples transparently. No code needed.
Format change — canTrackUseGapless returns false for next track, setTimeout fallback hands off to AudioLoader.
Setting toggled mid-play — #checkPreBuffer re-reads the setting live. Current track finishes gaplessly, next track picks up the new setting.
