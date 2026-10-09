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
4. On desktop, drag a task onto the board or use **Place** for automatic first-fit placement. On mobile, select one or more unplaced tasks with the bulk placement flow; commit only if the whole selection fits.
5. Move board tasks only by drag. Tap/click a board task to open a readable task-detail view, including for 1×1 blocks. Active-task details include elapsed days since creation. Completion-history details show completion time instead of elapsed days. Task-list and completion-history cards use explicit **Details** actions rather than whole-card detail clicks.
6. Complete a placed task directly from its board block.
7. Undo a completion from the toast, or later restore it from Completion history. Mini board also exposes its own latest-completion Undo.
8. Resize the board using presets or independent rows/columns from 3 to 16.
9. Save the current capacity board as a clean PNG snapshot when needed.
10. On supported browsers, open Mini board for an always-on-top board view with note previews where space allows.
11. Save or restore a JSON backup when needed; optionally copy a URL backup for a small data set.

## 4. Functional requirements

- Task list is independent of board placement and retains all active tasks.
- A separate Important-only toggle intersects the All/Unplaced/Placed status filter and case-insensitive title/note search. Filtering affects only visible task-list membership, keeps manual order and card/row modes, and does not change the board, ID-based bulk selection, stored task state, or full JSON/URL backups. Important-only and placement filters are session-only and reset on reload; full reset also clears search.
- Every task-list render synchronizes status and Important toggle highlights and `aria-pressed`; Reset all returns the status to All, turns Important-only off, and clears search.
- Completion history is separate from the active task list.
- Each task has title, optional note, width (1–8), height (1–8), and Important boolean.
- Active-task and completion-history details expose Duplicate. It closes details and opens the existing Add form with title, note, width, height, and Important prefilled, and the title selected. Saving creates a fresh ID and creation time, unplaced, with `sample: false`; source tasks/history remain unchanged. Cancel, close, and Escape create nothing. The ordinary save toast provides Undo.
- New task creation (Add or Duplicate), history restoration, and Mini board Undo stop at 500 active tasks with a localized explanation and preserve source data; an Add draft stays open and editing remains available. Completion stops at 500 history entries without deleting the active task or older history.
- JSON and URL restore validate schema-1 structure, task fields, collection limits, and unique IDs across active/history before replacing state. Invalid input preserves current data. Newer imports or state changes invalidate older pending results; a successful restore closes stale task dialogs and clears Mini board/toast Undo. Mini board Undo also dismisses stale main-window snapshot Undo.
- Default board is 5×5.
- Board presets: 4×4, 5×5, 7×7, 9×9 plus custom rows and columns from 3–16.
- Placed tasks may not overlap or extend beyond board bounds.
- Important tasks use a visually distinct warm board color.
- Every active task exposes Details and Complete actions in the task list, and every placed block exposes a Complete button while the block itself opens Details on tap/click.
- Completing removes the task from active tasks and records a completion timestamp in history.
- Completion provides toast Undo.
- History entries expose Details, can be restored to the active task list as unplaced tasks, deleted individually with Undo, or cleared in bulk after confirmation.
- Desktop supports drag-and-drop from the list, moving placed blocks, board → list unplacement, task-list reordering, active → history completion, and history → active restoration.
- Touch/mobile supports multi-select placement of unplaced tasks. Placement is atomic: selected tasks are simulated first and none are committed if the whole selection cannot fit.
- Board tasks use click/tap for details and a drag threshold for movement. Mouse HTML drag-and-drop remains available even in a narrow responsive layout, while touch uses per-task Pointer Events routed through document-level move/up handlers with a Touch Events fallback; board cells are never tap-to-place targets.
- The capacity board displays a compact usage hint: tap/click for details, drag to move, and the check control to complete.
- Resizing smaller keeps all tasks; placements that no longer fit become unplaced.
- Show occupied percentage, used/total cells, free cells, unplaced tasks, and largest free rectangle.
- Provide deterministic first-fit-decreasing compact/repack.
- Export the current capacity board as a PNG using only local Canvas APIs. The image preserves board dimensions, task geometry, Important coloring, task titles, note previews where space allows, and capacity usage while omitting interactive controls.
- Mini board uses Document Picture-in-Picture when available, shows note previews when tile space allows, permits completion from the PiP window, and exposes Undo for the latest completion made there. Mini Undo restores only that task at its original zero-based list index (clamped to the current list length), preserving newer edits, additions, other completions, and relative order of remaining tasks. Its original placement is restored only if it still fits; otherwise it returns unplaced. The remembered index is transient and never added to schema-1 data.
- If Document Picture-in-Picture is unavailable, hide the Mini board control entirely and keep normal board behavior unchanged.
- Reversible actions use the reusable toast + Undo pattern where practical.
- Built-in sample tasks are explicitly tagged. While any remain, a dismiss-on-cleanup banner appears at the top of the task list with **Clear sample data**; it removes only sample tasks/history and offers toast Undo. Editing or duplicating a sample task produces normal user data. Legacy sample detection applies only to records whose sample flag is missing; an explicit false survives reload, Undo, and JSON restore.
- Task deletion and full reset use the reusable confirmation dialog. Full reset explicitly warns that sample data will be recreated.
- Persist active tasks, history, importance, board settings, and placements in localStorage when available.
- Export/import a JSON backup using schema version 1. JSON remains the primary portable backup.
- Optionally gzip-compress the same schema-version-1 state with the browser-native CompressionStream API, Base64URL-encode the compressed bytes, and store them in the URL fragment for small transfers. URL backup must be presented as secondary, must warn that compression is not encryption, and must confirm before restoring over local state.
- Switch Japanese and English without reload.
- Runtime network access is blocked.

## 5. Data and privacy

- All task data, completion history, and layout state remain in browser memory/localStorage.
- No login, analytics, telemetry, server storage, or runtime API request.
- JSON download/upload occurs only from explicit user action.
- URL backup is also explicit-only, keeps its gzip-compressed payload in the URL fragment, and must be treated as encoded—not encrypted—data.

## 6. Non-goals

- Team collaboration or cloud sync.
- Calendar scheduling.
- Notifications or reminders.
- Accounts.
- AI estimation of task size.
- Treating one cell as a fixed amount of time.

## 7. UX and accessibility

- Header language control shows the target EN / JA, with matching localized aria-label and title (`英語に切り替え` / `Switch to Japanese`). Switching language preserves current data and useful UI state. Privacy remains `完全ローカル処理` / `Fully local processing`, and Help is localized.

- Desktop: task list and completion history at left, capacity board at right, settings below. Task list starts expanded; Completion history starts collapsed; both are independently collapsible.
- Smartphone: four bottom tabs (Tasks / Board / History / Settings); only one page is shown at a time.
- Mobile multi-placement must work without HTML drag-and-drop and must validate capacity before committing.
- Visible keyboard focus, accessible Details/Complete labels, and keyboard-selectable board tasks.
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
- With filters cleared, every active task stays visible in the task list whether placed or unplaced.
- Important-only combines correctly with each placement status and title/note search in both languages and both list views; no-match and empty-list messages remain distinct. Importance edits, completion, and Undo immediately update filtered membership.
- Reset all clears the filters and search and visibly/semantically selects All. A canceled reset preserves them.
- Mini Undo of B from A,B,C restores A,B,C; restored order and fields survive localStorage reload and JSON backup. Newer changes to other tasks/history/board remain intact and existing capacity and placement checks still apply.
- Task list supports two presentation modes: the default information-rich card view and a compact single-row view. The choice is stored as a local UI preference and does not change backup schema version 1.
- Important state persists and changes board-block color.
- Duplicating placed/unplaced/history tasks preserves editable fields, including custom 8×8 and Important, without sharing identity, placement, completion, or sample status. Repeated saves create independent copies; Undo removes the most recent copy.
- Saving/restoring the 500th active task and completing the 500th history entry succeeds; attempts beyond either limit are rejected without mutation or silent loss on reload.
- Enter/Space on a focused board tile opens Details; Enter/Space on its nested Complete button retains native button activation.
- Normal tasks matching the built-in samples remain normal across sample clearing, reload, Undo, and JSON backup/restore.
- Clicking/tapping any board task opens a readable detail view with size, Important state, placement state, elapsed days, note text, Edit, Complete, and Remove actions. The detail view does not add a decorative note icon. Task-list cards do not open details when the card body is clicked; their explicit Details action does.
- Board tiles preview note text whenever the rendered tile has enough vertical space; the preview automatically hides or clamps to fit and never replaces the full detail view.
- Custom width/height fields stay hidden until Other is selected.
- Completing from the board removes the task, creates a history record, and offers Undo.
- History is separate from the task list, provides per-entry Details, supports per-entry deletion, bulk clear with confirmation, and can restore tasks.
- Task-list order persists after drag reordering.
- Dragging a placed task onto the task list unplaces it.
- Dragging active tasks to history completes them; dragging history back restores them.
- Shrinking the board does not delete tasks.
- Mobile can select multiple unplaced tasks and place the whole selection atomically. Capacity failure and shape/layout failure are reported without partial placement.
- Sample data can be cleared independently without touching user-created tasks or history; the clear button disappears afterward, Undo restores it, and Reset all recreates the samples.
- JSON backup restores active tasks, history, importance, sizes, board dimensions, and valid positions. URL backup uses the same state shape and restore validation, gzip compression plus Base64URL encoding, and remains secondary and size-limited.
- Board image export produces a downloadable PNG without network access or interactive controls.
- Mini board opens and syncs on supported browsers, while the Mini board button is absent when unsupported.

## Brand icon consistency

- Brand backgrounds use #16624f with corner radii equal to exactly 25% of each background axis. Preserve foreground artwork, placement, and existing canvas padding across SVG assets, app headers, and embedded favicons.
