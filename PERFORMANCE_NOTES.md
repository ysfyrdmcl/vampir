# Performance Notes

## Overlay queue / duplicate animation risk

- Risk: `GAME_RESULT` and summary fallback logs can describe the same death/no-death outcome. If both produce major SVG overlays, low-end devices pay for duplicate mount/animation work and the phase screen underneath can advance while the player is still reading.
- This pass: `PhaseTransitionOverlay` now uses deterministic dedupe keys and a FIFO queue so only one major overlay runs at a time. GameOver clears the overlay queue because the final screen owns that flow.
- Next: add a small pure unit test around mobile overlay event-to-key mapping if a mobile test runner is added.

## SVG effect density

- Risk: death/result overlays, blood/candle/mist effects, and screen backgrounds can overlap during rapid phase changes.
- This pass: major overlays are serialized and duplicate result animations are dropped. Blood/candle assets were not reworked.
- Next: profile DeathTransition and GameOverTransition on a mid-range Android device and consider static fallback for reduced-motion or low-memory devices.

## Bot speech history list growth

- Risk: a long rumor history in a `ScrollView` would render all rows at once.
- This pass: the rumor history sheet uses `FlatList`, while the store still caps history to a small recent window.
- Next: if history becomes persistent or uncapped, add item memoization and a stricter pagination/retention policy.

## GameLog list growth

- Risk: GameLog still groups and maps the full filtered log set, which can become expensive in long games.
- This pass: no broad GameLog refactor was made.
- Next: move timeline rows to `SectionList`/`FlatList` and memoize row components after gameplay flow is stable.

## Countdown render cost

- Risk: countdown updates once per second and can re-render screen chrome.
- This pass: no countdown refactor was made.
- Next: isolate countdown state further or move visual ticking into Reanimated where practical.

## Real device QA checklist

- First night death followed by MayorElection: verify one death SVG, then DayStart/MayorElection in order.
- Current user eliminated: verify public result and personal eliminated overlay do not overlap.
- GameOver -> New Game and GameOver -> Main Menu: verify no stale result loading copy appears.
- Rumor sheet with 20 entries: verify smooth open/scroll on a mid-range Android device.
