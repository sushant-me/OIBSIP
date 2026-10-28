# Taskline — Demo Notes

Exact UI steps that demonstrate every requirement (top to bottom in the browser).

1. **Empty states** — open the app: both lists show friendly empty-state cards and the
   counters read “0 pending” / “0 completed”.
2. **Add Task** — leave the input empty and click **Add Task**; an inline red error appears.
3. Type `Draft the internship report`, click **Add Task**: it appears at the top of **Pending**,
   the counter reads “1 pending”, and it shows an “Added …” timestamp.
4. Add `Review the to-do app checklist` by pressing **Enter** in the input (form submits), then
   add `Send weekly progress update` with the button.
5. **Mark Complete** — click the round check button on a pending task: it moves to **Completed**,
   the counters switch to “2 pending” / “1 completed”, and a “Completed …” timestamp appears.
6. **Toggle back** — click the green round check button in Completed: the task returns to Pending.
7. **Inline Edit (save)** — click **Edit** on a pending task, change the text, press **Enter**;
   the updated title is saved and edit mode closes.
8. **Inline Edit (cancel)** — click **Edit** again, type a different title, press **Escape**;
   the original text is unchanged.
9. **Delete + Undo** — click **Delete** on a pending task; it disappears and a toast appears.
   Click **Undo** in the toast: the task returns.
10. **Delete from either list** — complete a task, then click **Delete** inside the Completed
    list; the item is removed and the completed counter decreases.
11. **Filter tabs** — click **Pending**, then **Completed**, then **All**; the matching panel is
    shown/hidden while the counters stay accurate.
12. **Clear completed** — with at least one completed task, click **Clear completed (n)** at the
    bottom of the Completed panel; the list empties and the toast offers **Undo**.
13. **Persistence** — refresh the page (F5): the same tasks, completion states, counters and
    timestamps are restored from localStorage. Check DevTools → Application → Local Storage →
    `taskline.tasks.v1` to see the stored JSON.
14. **Empty state after clearing** — delete every task: both friendly empty-state messages return
    (the pending copy changes to “All caught up” when every task is done instead of deleted).
15. **Keyboard only** — press Tab repeatedly: every button and the input show a visible focus ring;
    use Enter/Space to act, and Enter/Escape while editing a task.
16. **Responsive** — resize to 360×640, 768×1024 and 1440×900: panels stack on small screens,
    nothing overlaps or clips, and there is no horizontal scrollbar.

Reset the demo at any time with DevTools → Application → Local Storage → delete
`taskline.tasks.v1`, then refresh.
