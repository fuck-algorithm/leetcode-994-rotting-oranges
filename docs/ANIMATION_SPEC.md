# Animation Specification — LeetCode 994 Rotting Oranges

## Observable state

- **Main structure:** fixed-coordinate grid; each cell keeps the stable identity `row-col` across every algorithm step.
- **Cell states:** empty, fresh, rotten. Rotten cells retain their infection minute (`tN`); initial sources are labelled `初始`.
- **BFS state:** queue snapshot, current source cell, target neighbor, direction, current minute, remaining fresh count, and newly infected cells.
- **Code state:** `highlightedLines`, variables, and call-stack snapshots from `generateSteps`.

## Animation grammar and focus

| Event | Visual cue | Teaching message |
| --- | --- | --- |
| Initial scan | Stable grid cells appear; initial rotten cells are queued | Initial rotten cells are all sources at minute 0. |
| Begin BFS wave | Current source gets a blue outline; queue panel exposes its FIFO head | Only cells in the queue at the start of a wave spread this minute. |
| Check/infect neighbor | Direction arrow points from source to target; newly rotten cells pulse | Infection moves only to an in-bounds fresh neighbor. |
| Wave complete | All cells infected in that wave share the wave outline and timestamp | Newly infected cells can spread starting in the next minute. |
| Complete | Final grid, counters, and return value remain visible | Return elapsed minutes, or -1 if unreachable fresh cells remain. |

The algorithm emits immutable `GridState` snapshots; the visualizer replays them and never recalculates BFS while rendering. Each cell ID is derived from its grid coordinate. D3 keyed joins reuse cells and the direction overlay; enter/exit transitions are interrupted on the next frame. Exit transitions remove elements from their completion callback.

## Motion, reduced motion, and color

- New cells fade in over 160ms; removed cells fade out over 120ms. These durations remain short relative to the 800ms playback dwell.
- `prefers-reduced-motion: reduce` sets D3 enter/exit durations to zero and disables CSS animation/transition effects.
- Grid semantics use dark gray (empty), orange (fresh), and brown (rotten). Current source and newly infected cells also use outlines, timestamps, icons, and text; color is not the only signal.
- Wave outlines cycle through yellow, blue, green, red, orange, and green. No purple hue is used.

## Teaching layer

- A persistent phase caption describes initial scan, BFS FIFO waves, new infections, or completion.
- A fixed legend explains empty/fresh/rotten cells, glowing outlines, and `tN` timestamps.
- Infection arrows are annotated with direction and target coordinates.
- `aria-live="polite"` announces phase guidance, and the grid SVG has a descriptive accessible name.

## Evidence and limits

- Unit/property suite: `npm run test:coverage` (39 tests; thresholds lines 60%, functions 60%, branches 50%).
- Browser checks: `npm run test:e2e` covers stable cell keys through step navigation, phase/legend visibility, reduced-motion CSS, and purple-token absence.
- Full 15-case template matrix, visual recording, and viewport-space-budget assertions are not implemented in this repository; those acceptance items remain FAIL and are not claimed as passed.
