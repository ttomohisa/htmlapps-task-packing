# APP_SPEC.md

## 1. Product identity

- **Working name:** Task Packing
- **One-sentence purpose:** Give tasks physical size and fit them onto a finite board so capacity is visible before more work is accepted.
- **Primary users:** Individuals who want a lightweight local-first alternative to endless task backlogs.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Problem and outcome

Normal ToDo lists can grow without limit. Task Packing keeps a normal task inventory, but adds a finite board where each task occupies a user-defined area. Important tasks are visually distinct. Completing a board task moves it out of the active list and into a separate completion history.

## 3. Core user flow

1. Add tasks to the task list and choose a size from XS–XL; choose **Other** to reveal custom width/height.
2. Optionally mark a task Important.
3. Keep tasks in the list regardless of whether they are placed.
4. Choose **Place** and tap an empty board cell, or drag a task onto the board on desktop.
5. Complete a placed task directly from its board block.
6. Undo a completion from the toast, or later restore it from Completion history. Mini board also exposes its own latest-completion Undo.
7. Resize the board using presets or independent rows/columns from 3 to 16.
8. On supported browsers, open Mini board for an always-on-top board view.
9. Save or restore a JSON backup when needed.

## 4. Functional requirements

- Task list is independent of board placement and retains all active tasks.
- Completion history is separate from the active task list.
- Each task has title, optional note, width (1–8), height (1–8), and Important boolean.
- Default board is 5×5.
- Board presets: 4×4, 5×5, 7×7, 9×9 plus custom rows and columns from 3–16.
- Placed tasks may not overlap or extend beyond board bounds.
- Important tasks use a visually distinct warm board color.
- Every placed block exposes a Complete button.
- Completing removes the task from active tasks and records a completion timestamp in history.
- Completion provides toast Undo.
- History entries can be restored to the active task list as unplaced tasks, deleted individually with Undo, or cleared in bulk after confirmation.
- Desktop supports drag-and-drop from the list, moving placed blocks, board → list unplacement, task-list reordering, active → history completion, and history → active restoration.
- Touch/mobile supports selecting a task then tapping a cell to place it.
- Resizing smaller keeps all tasks; placements that no longer fit become unplaced.
- Show occupied percentage, used/total cells, free cells, unplaced tasks, and largest free rectangle.
- Provide deterministic first-fit-decreasing compact/repack.
- Mini board uses Document Picture-in-Picture when available, permits completion from the PiP window, and exposes Undo for the latest completion made there.
- If Document Picture-in-Picture is unavailable, show a clear non-destructive message and keep normal board behavior.
- Reversible actions use the reusable toast + Undo pattern where practical.
- Task deletion and full reset use the reusable confirmation dialog.
- Persist active tasks, history, importance, board settings, and placements in localStorage when available.
- Export/import a JSON backup using schema version 1.
- Switch Japanese and English without reload.
- Runtime network access is blocked.

## 5. Data and privacy

- All task data, completion history, and layout state remain in browser memory/localStorage.
- No login, analytics, telemetry, server storage, or runtime API request.
- JSON download/upload occurs only from explicit user action.

## 6. Non-goals

- Team collaboration or cloud sync.
- Calendar scheduling.
- Notifications or reminders.
- Accounts.
- AI estimation of task size.
- Treating one cell as a fixed amount of time.

## 7. UX and accessibility

- Desktop: task list and completion history at left, capacity board at right, settings below.
- Smartphone: four bottom tabs (Tasks / Board / History / Settings); only one page is shown at a time.
- Mobile placement must work without HTML drag-and-drop.
- Visible keyboard focus, accessible Complete labels, and keyboard-selectable board tasks.
- Respect `prefers-reduced-motion`.
- Do not use emoji as primary iconography.

## 8. Performance expectations

- Smooth interaction up to 500 active tasks, 500 history records, and a 16×16 board.
- Board collision checks and free-space analysis are local and synchronous.

## 9. Browser target

Current stable desktop and mobile Chromium, Firefox, and Safari. Direct `file://` opening is required for the core app. Mini board is an enhancement and depends on Document Picture-in-Picture availability.

## 10. Acceptance criteria

- Source retains exactly one each of the three build placeholders.
- Build output contains no runtime external resource URL and CSP includes `connect-src 'none'`.
- 5×5 default board renders correctly.
- 4×4 / 5×5 / 7×7 / 9×9 / custom board dimensions can be applied.
- A 3×2 task cannot overlap another task or cross the board boundary.
- Every active task stays visible in the task list whether placed or unplaced.
- Important state persists and changes board-block color.
- Board tasks with notes expose a compact note popover with an Edit shortcut.
- Custom width/height fields stay hidden until Other is selected.
- Completing from the board removes the task, creates a history record, and offers Undo.
- History is separate from the task list, supports per-entry deletion, bulk clear with confirmation, and can restore tasks.
- Task-list order persists after drag reordering.
- Dragging a placed task onto the task list unplaces it.
- Dragging active tasks to history completes them; dragging history back restores them.
- Shrinking the board does not delete tasks.
- Mobile can place a task with select → tap cell.
- JSON backup restores active tasks, history, importance, sizes, board dimensions, and valid positions.
- Mini board opens and syncs on supported browsers, while unsupported browsers fail gracefully.
