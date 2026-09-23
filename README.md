# OUR TIME

A local-only Expo / React Native app for two children getting ready together.
“Get ready together. The time that’s left is ours.”

## Run

From this folder in PowerShell:

```powershell
npm.cmd install
npm.cmd start
```

This checkout includes Node 24 as a development dependency: npm scripts use it automatically.
For a fresh computer, install Node 24 LTS first. The computer's existing Node 20 is too old for Expo SDK 57.
Press `w` in the Expo terminal for the web version. If a port is occupied, accept another port or use `npm.cmd start -- --port 8094`.

### iPhone / iPad

1. Install the current Expo Go from the App Store (SDK 57 support required).
2. Connect the phone/tablet and computer to the same Wi-Fi.
3. Run `npm.cmd start` and scan the terminal QR code with the iPhone Camera.
4. Open in Expo Go. Enter the two names, choose a departure time later today, and set all five estimates.
5. Start the morning. Each child chooses their own task and presses DONE themselves.

See [Expo's device instructions](https://docs.expo.dev/get-started/start-developing/).
No account, backend, or native build is required for this app's features. Windows cannot run the iOS Simulator; use the real device.
iPad and rotation are enabled. Panels sit side by side from 760 logical pixels; narrower screens stack them with shared clocks fixed above the scrolling content.

## Small architecture

```text
src/
  app/_layout.tsx             Expo Router root, safe areas
  app/index.tsx               Connects saved state to the current screen
  domain/models.ts           Children, configurable tasks, routine, session
  domain/engine.ts            Pure timestamp calculations and task transitions
  storage/persistence.ts      Versioned AsyncStorage record; serialized writes
  hooks/use-routine.ts        Load/save, state actions, clock repaint and app resume
  screens/setup-screen.tsx   Names, departure time and collaborative estimates
  screens/morning-screen.tsx Shared clocks, readiness, OUR TIME and departure
  components/child-panel.tsx Independent choices, active task and DONE
  components/routine-ui.tsx  Large buttons, icons and shared styles
  components/visual-time-circle.tsx  Reusable animated filled-disc timer
tests/engine.test.cjs         Focused engine tests using Node's test runner
```

Configuration and the active session are saved after changes. A session contains a configuration snapshot,
fixed deadline, completed task IDs, accumulated task time, active-task timestamps, and OUR TIME mode.
No per-second writes or historical records. Save/load errors are visible with a retry action.

## OUR TIME calculation

For each unfinished task:

```text
elapsed = saved time spent + (now − active start timestamp, if active)
estimated task work left = max(0, estimate − elapsed)
child work left = sum of that child's estimated task work left
family work left = max(child work left across children)
OUR TIME = max(0, deadline − now − family work left)
```

Completed tasks contribute zero. Children run in parallel, so their workloads are never added together.
Switching banks the time already spent, pauses that task, and allows another choice without a penalty or reset.
Once a task exceeds its estimate, its estimated work left stays zero while the deadline keeps approaching:
OUR TIME can shrink before DONE is pressed. A faster completion releases its unused estimate only when
it reduces the family's largest remaining workload. Idle time while choosing also uses real time.

When everyone is ready, all remaining time is OUR TIME. Starting that mode does not reset or extend the
deadline. At departure, both clocks clamp to zero and “Time to go” appears. Unfinished tasks remain available.
The interval only redraws the screen; absolute timestamps make background/reopen calculations correct.

### Visual time

Active tasks use large solid discs, emptying clockwise from 12 o'clock as their estimates are used.
An expired estimate stays empty with a calm message until DONE is pressed. Small numbers below DONE
are for parents. The shared OUR TIME disc grows or shrinks with the unchanged engine calculation.
Its fixed reference is twice the initial projected free time (minimum one minute), capped at the
original morning duration. If initial free time is zero, the reference is the morning duration.
The reference is reconstructed from the initial configuration, so reopening or starting OUR TIME
does not reset its scale. Values above the reference display a full disc; the small number stays exact.
The component interpolates supplied progress over 500ms, honors Reduce Motion, and never calculates
elapsed task time. Rendering uses the Expo-compatible `react-native-svg` package, not an animation framework.

## Checks

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd exec -- expo install --check
npm.cmd exec -- expo export --platform ios --platform web
```

13 tests cover parallel workloads, unequal workloads, task order, early/overdue completion, one/all children
ready, zero free time, the reached/passed deadline, timestamp restoration, switching, duplicate completion,
and departure-time validation. iOS Hermes and web exports were verified. Browser smoke testing covered
setup, independent active tasks, switching, DONE, reload persistence, completion, OUR TIME restoration,
and returning to setup while preserving configuration. Phone/tablet web layouts were visually inspected.
Native touch behavior and haptics still need testing on your actual iPhone/iPad.

## V1 decisions and first family test

- UI language is English, following the brief. Two editable children are data, not engine assumptions.
- Five default tasks share the same estimates for both children. Estimates start unset: the family supplies
  them in one-minute increments (1–120 minutes), rather than receiving suggested durations.
- The departure time uses a 24-hour clock and today's local date. A past time is rejected, never silently
  moved to tomorrow. A saved session is restored even after departure; the parent can end it to start again.
- Task switches retain elapsed work. Watch whether this matches what the children expect after interruptions.
- Early completion may leave OUR TIME unchanged because another child still needs longer. Watch whether the
  family understands this shared projection without interpreting it as an individual reward.
- DONE is immediate; V1 has no undo. Observe accidental taps. Check whether the comb icon is understood and
  whether scrolling between children on a phone is comfortable; a shared iPad should work better.
- Departure feedback is a subtle foreground haptic when supported. There is no background alarm or
  notification. Reopening shows the correct time, but the app cannot alert while suspended.
- Keep the default Expo launcher artwork for this functional V1. No custom branding assets were added.

Intentionally omitted: accounts, server, sync, statistics/history, scores/rewards, task ordering/locks,
additional routine types, notification scheduling, and all other non-goals in the brief. No roadmap is
needed before testing the morning with your family.
