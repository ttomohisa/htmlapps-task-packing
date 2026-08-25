# Changelog

## 1.0.0 - 2026-08-25
- Prevent task cards in the task list from stretching to fill unused vertical space; restore proportional mini size grids and simplify board notes.
- Fixed board-internal drag-and-drop regression; moving a placed block now preserves the grabbed cell and allows self-overlapping moves.
- Improved capacity-board readability with larger task titles, completion controls, note controls, and inline note previews on larger blocks.
- Normalized task-list visuals so task size no longer changes the size glyph or card layout; size is shown inside a fixed preview frame and badges.

- Initial Task Packing implementation.
- Added independent task list and finite capacity board.
- Changed the default board to 5×5 and presets to 4×4 / 5×5 / 7×7 / 9×9.
- Added variable task sizing, collision/overflow prevention, drag-and-drop, and touch placement.
- Added Important tasks with distinct board coloring.
- Added in-board completion controls with toast Undo.
- Added a separate completion history with restore action.
- Added an optional always-on-top Mini board using Document Picture-in-Picture.
- Added capacity metrics and largest-free-rectangle analysis.
- Added local persistence and JSON backup/restore including history and importance.
- Added responsive four-tab mobile navigation and bilingual UI.
- Added task-list drag reordering and drag transfer between active tasks and completion history.
- Added board → task-list drag unplacement and improved placed-task dragging when the valid destination overlaps the task's current footprint.
- Added compact note popovers on board blocks.
- Added per-history-entry deletion with Undo.
- Added icons to list actions and custom size fields behind an Other choice.
- Added Mini board in-window Undo for accidental completions.
- Renamed Japanese UI terminology from 盤面 to ボード.
