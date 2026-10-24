---
name: take-task
description: Pick the highest-priority open task from the docs/tasks hub and carry it through to done (status updates, branch, implementation, checks, report). Use when the user says "take the next task", "візьми задачу", "наступна задача", names a task id like T-004, or invokes /take-task. Optional argument - a task id (T-007) to take that one instead of auto-picking.
---

# Take a task from the hub

The hub is `docs/tasks/README.md` (backlog table, priority scale, recommended order) plus one file per
task (`docs/tasks/T-xxx-*.md`) with YAML frontmatter: `priority`, `size`, `status`, `epic`,
`needs-approval`. The task file is the brief: follow its scope and acceptance criteria, not your own
idea of the feature.

## 1. Choose the task

If the user gave a task id, take that one. If its status is `in-progress` or `done`, say so and ask
before taking it anyway. If it is `superseded`, do not take it: point to the tasks its file lists.

Otherwise, auto-pick:
1. Read the backlog table in `docs/tasks/README.md` and the frontmatter of each task file. The file's
   frontmatter is the source of truth. If it disagrees with the table, use the file and fix the table later.
2. Candidates: `status: todo` only. Skip `in-progress` (someone else has it), `blocked`, `done` and
   `superseded`.
3. Sort by priority, P0 → P3. Within the same priority, follow the "Рекомендований порядок" paragraph
   in the README. Then prefer the smaller size.
4. Skip a candidate whose "Після" column in the table names a task (or a stage of one, "T-016 ет. 2")
   that is not done yet. A stage counts as done when the owning task's `## Прогрес` section says so.
   Also skip it if the task file itself names an unfinished dependency. Mention what you skipped and why.
   If a task is blocked only by a stage of a bigger task, offer to take that stage instead.
5. Before you implement, read "Карта перетинів" in the README. Build only the topics your task owns.
   For a topic another task owns, use what exists or leave a note in the owner's file. Do not build it here.
6. Tell the user in one or two lines which task you picked, why it is first, and what comes next in line.

## 2. Check approvals before any work

Read the whole task file. If `needs-approval` is anything other than `no`, quote it to the user and ask
the specific question before doing that part. Examples: a new dependency, starting a later PRD phase,
a balance or product decision, a list of names to sign off. If the approval only covers one stage (like
"Етап 3" in T-004), you may do the other stages first. Say so when you start.

Never install a package, add network calls or change product scope without that answer
(`.agents/rules/safe-code.md §6`, `product.md`).

## 3. Start

1. Set `status: in-progress` in the task file and in the README table row.
2. If you are on `main` or on a branch for unrelated work, create `task/T-xxx-<slug>` from the current
   base. In an app-made worktree, stay in it.
3. Read what the task points at: the PRD sections it names (`docs/PRD.md`), the rule files it cites,
   and every file under "Де в коді". Check the current code still matches "Що бачимо зараз". If the
   problem is already gone or different, update the task file and tell the user instead of
   implementing a stale plan.

## 4. Implement

- Work stage by stage for `size: L` tasks. Each stage must leave the app working and should be a
  separate commit (and a separate PR if the user wants).
- Keep to "Що зробити". Anything from "Поза скоупом" or new ideas → note them in the task file under
  "Ризики і відкриті питання" (or propose a new task file from `_TEMPLATE.md`). Do not build them.
- Follow `CLAUDE.md` and `.agents/rules/*`: FSD import direction, rules in the model and not the UI,
  Decimal for unbounded values, i18n keys for all player text, `SAVE_VERSION` bump with a migration
  test when the save shape changes.
- Every bug fix gets a regression test that would have failed before the fix.
- For UI tasks, look at the result in the running app (the `web` config in `.claude/launch.json`) at
  375×812 and at a desktop width. Take before/after screenshots of the affected tabs for the report.

## 5. Verify

Run all three and report the real results:
- `npm run ts:check`
- `npm test`
- `npx expo export --platform web --output-dir <scratch dir>`

Then go through every checkbox in "Критерії готовності". Tick (`- [x]`) only what you actually
verified. For anything you could not verify (a native device, a playtest with people), leave it
unticked and say so.

## 6. Close out

- All criteria ticked → `status: done` in the file and in the table.
- Something is left (an unticked criterion, a pending approval, the next stage of an L task) → keep
  `in-progress`, or set `blocked` if it waits on the user. Write what is left at the end of the task
  file under a `## Прогрес` heading, with the date.
- Commit only this task's files plus the task file and README. Leave unrelated changes alone and name
  the files you left out. Commit and push only if the user asked, or if the session's standing
  instructions say to.

## 7. Report to the user

Keep it short and in the user's language:
- what changed for the player (one or two sentences, human terms);
- which acceptance criteria are met and which are not, and why;
- check results (ts:check / test / export), and screenshots for UI work;
- the next task in priority order, so they can say "далі".
