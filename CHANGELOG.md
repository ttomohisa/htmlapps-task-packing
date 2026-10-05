# Changelog

## Unreleased
- Added a session-only Important-only task-list filter that combines with placement status and title/note search in Japanese/English, without altering task order, board data, or complete backups.
- Fixed Reset all leaving a stale status-filter highlight; filter buttons now render their active and pressed states from current filter state.
- Fixed Mini board completion Undo appending tasks out of order. It now restores the original list index while retaining intervening edits and placement/capacity protection.
- Added Duplicate to active-task and completion-history details, using the existing Add form and save Undo. Copies start unplaced with a fresh identity and preserve title, note, size, and Important.
- Guarded the 500-record active/history limits for Add, Duplicate, Restore, Mini Undo, and Complete, preserving data instead of silently losing records after reload.
- Made JSON/URL restoration transactional: reject malformed or duplicate-ID data, ignore stale reads, and clear stale dialogs/Undo after replacement.
- Fixed Enter/Space on board completion controls and stale main-window Undo after Mini board Undo.
- Fixed legacy sample detection so explicitly normal tasks, including sample copies, stay normal after reload, Undo, and JSON restore.
- Added dependency-free task-flow regression tests and Japanese/English guidance.

## 1.0.2 - 2026-08-26
- Board tiles now preview task notes when enough space is available, with the visible line count adapting to each rendered tile size.
- Mini board tiles now show the same kind of space-aware note preview.
- Added a prominent **Clear sample data** banner to the task list while built-in samples remain; edited/user-created tasks are preserved and cleanup supports Undo.
- Reset-all confirmation now explicitly explains that the built-in sample data will be recreated.
- Hide the Mini board button entirely when Document Picture-in-Picture is unavailable.
- Added local PNG export for the current capacity board, preserving task geometry, Important colors, titles, note previews, and usage while omitting interactive controls.
- Added an optional URL backup for small data sets while keeping JSON as the recommended primary backup. URL data is gzip-compressed, Base64URL-encoded, stored only in the fragment, and restored only after confirmation.
- Board-to-board drag moves no longer show the placement toast; placement feedback is reserved for tasks newly added to the board.
- Refreshed Japanese/English screenshots, README documentation, release metadata, and standalone artifacts for v1.0.2.

## 1.0.1 - 2026-08-26
- Added a compact single-row task-list view alongside the existing card view, with the preferred view stored locally.
- Added an explicit Complete action to task-list entries and explicit Details actions to both active tasks and completion-history entries.
- Changed capacity-board interaction to a clearer model: tap/click opens task details, while movement is drag-only; a short interaction hint is shown above the board.
- Added collapsible desktop task-list and completion-history panels. The task list starts open and completion history starts closed.
- Added atomic mobile multi-task placement: selected unplaced tasks are simulated first and are placed only when the entire selection fits.
- Hardened board drag-and-drop across mobile and desktop layouts, including Pointer Events, Touch Events fallback, pointer-capture loss, and responsive layout switching.
- Improved action icons for place, remove, and complete so the task list matches the board interaction language more closely.
- Added elapsed days to active-task details while keeping completion-history details focused on completion time.
- Removed decorative note treatment from task details and removed Browser Kitty branding from the footer.
- Fixed persistence after unplacing and deleting tasks, and removed a duplicate heading ID found during release checks.
- Refreshed Japanese/English screenshots, README documentation, release metadata, and standalone artifacts for v1.0.1.

## 1.0.0 - 2026-08-26
- Initial Task Packing release with an independent task list and finite capacity board.
- Default 5×5 board with 4×4 / 5×5 / 7×7 / 9×9 presets and custom 3–16 row/column sizes.
- Variable task sizing, Important tasks, notes, capacity metrics, largest-free-rectangle analysis, and deterministic compact/repack.
- Drag placement and movement on desktop, task-list reordering, board → list unplacement, and active ↔ completion-history workflows.
- Task-list and in-board completion controls with toast Undo.
- Separate completion history with restore, per-entry delete + Undo, and confirmation-based Clear all.
- Optional always-on-top Mini board using Document Picture-in-Picture, including completion and latest-completion Undo.
- Local persistence and schema version 1 JSON backup/restore.
- Responsive mobile navigation, Japanese/English UI, single-HTML distribution, and runtime network blocking.
