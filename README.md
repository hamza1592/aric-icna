# Bulletin Board

A live prayer-times / mosque information display, built as a static site
(plain HTML/CSS/JS, no build step, no framework) meant to run full-time on a
TV via a Raspberry Pi in kiosk mode.

## Structure

- `index.html` — entry point, two panels: prayer times table (left), info
  panel (right: clock, date, next-prayer countdown, Jumu'ah, notices).
- `data/prayer-times.json` — hand-edited schedule, one entry per date. If
  today's date is missing, the app falls back to the most recent prior entry
  and logs a console warning — update this file monthly (or whenever your
  mosque publishes new times) rather than leaving it stale.
- `data/config.json` — mosque name/logo, timezone, Jumu'ah times, notices,
  and the auto-refresh interval.
- `js/registry.js` — tiny `{ id, mount, update }` panel convention. Adding a
  future panel (e.g. a donation QR code) means: one more `<section>` in
  `index.html`, one more `registerPanel(...)` call in `js/app.js`, and its
  own data file — no changes needed to the clock/date/countdown logic.
- `RASPBERRY_PI_SETUP.md` — how to run this full-time on a Raspberry Pi +
  TV in kiosk mode.

## Editing the data

Open `data/prayer-times.json` and add/update an entry per date (`YYYY-MM-DD`,
24-hour `HH:MM` times). Open `data/config.json` for the mosque name/logo,
Jumu'ah times, and rotating notices text.

`config.json`'s `hijriDayOffset` (default `0`) can be set to `1` or `-1` if
the calculated Hijri date doesn't match your mosque's officially announced
date for that month.

## Running locally

Browsers block `fetch()` of local JSON files opened directly via `file://`,
so preview with a throwaway static server from the repo root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

To test midnight rollover / countdown behavior without waiting for the real
clock, add a `?debugNow=` query param, e.g.:

```
http://localhost:8080/?debugNow=2026-08-28T23:59:50
```

"Now" then advances from that point at real speed, so you can watch a
midnight rollover happen in ~10 seconds.

## Deploying

This is a fully static site — deploy the folder as-is to any static host
(GitHub Pages, S3, nginx, etc.). There is no server-side component.
