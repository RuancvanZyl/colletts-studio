# Working without internet or power — design

Goal: the workshop keeps working through an internet or power cut. Everything done is stored on the device with its real
time, and syncs automatically when the connection returns. Nothing is lost, nothing is double-counted.

## What staff must be able to do offline
1. Open the app (it must load with no connection).
2. See their task list, job-card details and checklists as last loaded.
3. Mark a card opened, **Start task**, tick checklist steps, **Complete** a stage with photos.
4. Check trophies in at Receiving.
5. See a clear banner: "Offline — 4 actions waiting to send", and later "All synced".

Not offline (needs a connection): creating staff, assigning from the Dispatch Board, client messages, invoices, payments.

## How (four building blocks)
1. **Installable app + cached screens (PWA).** A service worker stores the app files so it opens offline; the app is added to the
   tablet's home screen. Updates download in the background when online.
2. **Local copy of today's work.** After every successful load, the task list, job cards, checklist items and progress are saved
   in the device (IndexedDB). Screens read the saved copy first, then refresh from the server when online.
3. **Outbox of actions.** Every worker action is written to a local queue *first*:
   `{ id (uuid), type, job, payload, done_at (the real time), device, user }`. If online it is sent straight away; if not it waits.
   On reconnect (and every minute while online) the queue is replayed **in order**.
4. **Server accepts "what really happened, when".** The database functions take the real `done_at` time and the action `id`
   (so a repeat of the same action is ignored). The audit trail shows the time the work was done, plus "synced later".

## Photos
Photos are kept on the device as files until uploaded; the card shows "photo waiting to upload". Upload runs after the data
actions so the record never points at a missing file. Large photos are resized on the device first.

## Conflicts (two people, or admin changed it while offline)
- Ticks / start / open: last write wins, both recorded.
- Assignment, priority, due date (admin): the server is the master; an offline worker's view refreshes on sync.
- Advancing a stage: if the card has already moved on, the action is **not** applied; it appears in a *Sync issues* list for a manager
  (with the worker's note and photos kept).
- Anything rejected by the checklist rule is shown to the worker as "needs attention", never silently dropped.

## Limits to know
- iPhone / iPad browsers can clear stored data if the app is unused for weeks and do not sync in the background; the app syncs the moment it is opened
  or the connection returns. Android tablets (Chrome) are more forgiving — recommended for the floor.
- Offline logins: a person already signed in stays signed in. A cold sign-in needs a connection once.
- Clocks: device time is used for `done_at`, with the server time recorded too; a large difference is flagged.

## Build order (each step is usable on its own)
1. PWA shell + install + offline banner.
2. Local copy of the task list / checklists (read offline).
3. Outbox for *open / start / tick* (the most frequent actions).
4. Outbox for *complete stage* with photos, and for Receiving.
5. Sync-issues screen for managers; device and sync log in the admin area.

## Power cuts (not software)
Put the router, the main workshop tablet charger and one mobile hotspot on a UPS / inverter. Tablets should hold a full shift.
A cut that kills the router becomes a non-event with this design: workers keep ticking, and everything catches up later.
