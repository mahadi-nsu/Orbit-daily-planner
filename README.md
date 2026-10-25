# ORBIT

A personal, local-first daily task manager, routine planner, and learning workspace built with Next.js App Router, strict TypeScript, Tailwind CSS, Dexie/IndexedDB, Tiptap, Zustand, React Three Fiber/Drei, GSAP, and Motion.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open the Local URL printed by Next.js (normally http://localhost:3000). If the port is occupied, Next chooses the next available port. For a production preview:

```sh
npm run build
npm start
```

Keep the same browser and origin/port to access the same local workspace. Browser storage is scoped to an origin. There is no backend, account, analytics service, or external content database. The local Next.js process serves the application; learning content and uploaded images stay in the browser.

## Getting started

- The front page is **My day**, a date-wise task list. Add a task with Enter or the Add task button, optionally add details, and use the checkbox or To do / In progress / Done selector to track it. Pick any date with the week strip or calendar, edit a task to reschedule it, and revisit unfinished work from earlier days. Tasks persist locally and are included in workspace backups; backups made before tasks were introduced remain importable.

- A sample pack is added once alongside your existing data: 13 tasks, 12 topics with reading notes and resources, a 14-day routine, and 12 clearly marked demo focus sessions. Dates are relative to the day the pack loads. Workspace settings can remove or reload the samples; your own entries and any sample parents they depend on are preserved. Removed samples do not return on refresh, and importing a personal backup does not add demo content.
- Create a topic from the Learning library. The topic form can create and select a missing category or parent topic inline without losing your draft. Every topic, including a parent with children, has an independent document.
- Add nested topics from the topic sidebar or library. Topic settings include rename, move, reorder, archive/restore, and confirmed recursive deletion. Library tree expansion stops at ten levels; open a topic to continue exploring deeper levels.
- Saved notes open in Read mode with larger text, clickable links, image captions, and code copying. Use the Read/Edit switch above the document to write or return to a protected reading view. New empty notes start in Edit mode.
- The workspace defaults to a light theme. The sun/moon switch in the top bar changes between light and dark; your choice persists across reloads and stays in sync between browser tabs.
- The editor supports headings, lists, checklists, quotes, links, tables, inline code, highlighted code blocks with language selection/copy, undo/redo, and local images. Upload, paste, or drop images into the editor; select an image to resize it and use its caption field.
- Save resources with progress and manual resume information. YouTube timestamps produce resume URLs; other platforms retain their original URL and your manual resume note. Playback is not automatically monitored.
- Plan a learning week (or a 14/30-day/custom period) with area targets such as Frontend — 4 hours, Backend — 3 hours, and AI — 2 hours. Add a missing learning area directly inside the target form; it is also available as a library category. Each target contains a checklist of study topics with To do / In progress / Done states. Write your own items or link existing library notes. Track completed topics separately from actual saved focus time inside the routine dates. Edit target hours, change routine dates, or duplicate a plan with a fresh checklist. Existing calendar routines migrate to area targets automatically; older backups are also converted without deleting their original records.
- Start a focus timer inside a topic. It survives reloads, can be paused/resumed, and records actual time with an optional note when finished. One persisted timer is shared across tabs.
- Use Cmd/Ctrl+K or Search to find topic titles, note text, and resource titles. Progress uses saved focus sessions, library topic statuses, and completed routine checklist items.
- Export a complete JSON backup from Workspace settings. It includes base64-encoded local images. Restore validates content, IDs, hierarchy, URLs, and image references before an atomic import. Add mode rejects any overlapping IDs; Replace requires typing `REPLACE` and replaces the entire workspace. Export before clearing browser storage or changing devices.

## Architecture

- `app/`: App Router screens, shared styles, root metadata and error boundary.
- `features/tasks/`: My day homepage, date navigation, quick task capture, optional details, editing, rescheduling, and task completion.
- `features/workspace/`: Navigation, library, topic workspace, resources, planner, timer, search, settings, and validated creation dialogs.
- `features/editor/`: Tiptap editor, local image node view, code block node view, debounced saving and navigation/visibility flushing.
- `lib/db.ts`: Versioned Dexie schema and repository operations, transactional mutations, timer ownership, hierarchy checks, and scoped deletion.
- `lib/demo-data.ts`: One-time sample pack, stable sample identifiers, and scoped removal that preserves personal entries.
- `lib/models.ts`: Domain models and shared URL/date/timer helpers.
- `lib/routine-plan.ts`: Routine target validation, legacy session conversion, and focus-hour totals scoped to a routine period.
- `lib/backup.ts`: Portable backup schema, reference validation, and atomic restore.
- `lib/store.ts`: Transient UI state only. IndexedDB data is observed with Dexie live queries, avoiding a second database cache in Zustand or TanStack Query. TanStack Query is available for future asynchronous network resources; the MVP needs no remote queries.

Reduced motion respects the operating system preference. The workspace contains My day, Learning library, Routine planner, Your progress, and settings.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Vitest/React Testing Library cover hierarchy integrity, independent notes, scoped deletion, archive/restore, routine migration, hour targets, checklist persistence, independent duplication, scoped focus totals, persisted timer ownership, backup/image round trips, unsafe URL rejection, and full-text search behavior.

Playwright covers the complete creation → notes/code/image/resource → reload → routine → topic → focus → routine editing → search → image-inclusive backup/restore workflow on desktop and mobile, plus reduced-motion navigation, inline category/parent creation, and removed-route checks. Tests run in isolated browser contexts and do not alter your personal workspace.

The Playwright configuration uses installed Google Chrome on macOS when available. On other systems, install Chromium using `npx playwright install chromium`; the test target defaults to `http://localhost:3001` (the local preview port used for this project). Set `PLAYWRIGHT_BASE_URL=http://localhost:3000` when your app uses port 3000, or use the URL printed by your server. Start the app before running the tests.

## Data and limitations

IndexedDB is browser/device/origin-specific. Backups are the way to move work between browsers or devices. Content is saved after a short debounce and flushed on in-app navigation, tab hiding, and page exit where the browser permits it; force-quitting a browser during a pending write may interrupt it. Uploaded raster images are limited to 20 MB each; importing backups is limited to 150 MB. There is no cloud sync, automatic third-party playback tracking, or account system in this MVP.
