import { registerPanel, panels } from "./registry.js";
import { mountPrayerTable } from "./panels/prayer-table.js";
import { mountInfoPanel } from "./panels/info-panel.js";
import { loadPrayerTimes, resolveEntryForDate, findEntryForDate, getNextPrayer } from "./prayer-times.js";
import { dateKeyFor } from "./clock.js";

// Optional ?debugNow=2026-08-28T23:59:50 query param for local testing:
// freezes a starting "now" and lets real elapsed time advance it from there,
// so midnight rollover / countdown edges can be watched in seconds instead
// of waiting for the real clock. Absent in production, zero runtime cost.
function createClock() {
  const params = new URLSearchParams(window.location.search);
  const debugNow = params.get("debugNow");
  if (!debugNow) {
    return () => new Date();
  }
  const base = new Date(debugNow).getTime();
  const startedAt = Date.now();
  return () => new Date(base + (Date.now() - startedAt));
}

async function buildPrayerTimesState(data, timezone, now) {
  const todayKey = dateKeyFor(now, timezone);
  const tomorrowKey = dateKeyFor(new Date(now.getTime() + 24 * 60 * 60 * 1000), timezone);

  const resolved = resolveEntryForDate(data, todayKey);
  const tomorrowEntry = findEntryForDate(data, tomorrowKey);

  if (!resolved) {
    console.warn(`[bulletin-board] No prayer-times entry found on or before ${todayKey}.`);
  } else if (resolved.isFallback) {
    console.warn(
      `[bulletin-board] No prayer-times entry for ${todayKey}; showing most recent entry (${resolved.entry.date}). Update data/prayer-times.json.`
    );
  }

  return {
    timezone,
    todayDateKey: todayKey,
    tomorrowDateKey: tomorrowKey,
    todayEntry: resolved?.entry ?? null,
    tomorrowEntry: tomorrowEntry ?? resolved?.entry ?? null,
  };
}

function scheduleReload(config) {
  const minutes = config.refresh?.reloadIntervalMinutes;
  if (!minutes || window.location.search.includes("debugNow")) return;

  const intervalMs = minutes * 60 * 1000;
  const now = Date.now();
  const msUntilNextBoundary = intervalMs - (now % intervalMs);
  window.setTimeout(() => window.location.reload(), msUntilNextBoundary);
}

async function main() {
  const [config, prayerTimesData] = await Promise.all([
    fetch("data/config.json", { cache: "no-store" }).then((r) => r.json()),
    loadPrayerTimes(),
  ]);

  const getNow = createClock();
  const timezone = config.timezone ?? prayerTimesData.timezone;

  let prayerTimes = await buildPrayerTimesState(prayerTimesData, timezone, getNow());
  let currentDateKey = prayerTimes.todayDateKey;

  const prayerTableController = mountPrayerTable(document.getElementById("panel-prayer-table"), {
    config,
    prayerTimes,
  });
  const infoPanelController = mountInfoPanel(document.getElementById("panel-info"), {
    config,
    prayerTimes,
  });

  registerPanel({
    id: "prayer-table",
    update: () => {
      const now = getNow();
      const next = getNextPrayer(
        now,
        prayerTimes.todayEntry,
        prayerTimes.tomorrowEntry,
        prayerTimes.todayDateKey,
        prayerTimes.tomorrowDateKey
      );
      prayerTableController.setNextPrayerKey(next?.key ?? null);
    },
  });
  registerPanel({ id: "info-panel", update: (now) => infoPanelController.update(now) });

  function tick() {
    const now = getNow();
    const dateKey = dateKeyFor(now, timezone);

    if (dateKey !== currentDateKey) {
      // Midnight rollover: re-resolve today's/tomorrow's entries from scratch.
      currentDateKey = dateKey;
      buildPrayerTimesState(prayerTimesData, timezone, now).then((next) => {
        prayerTimes = next;
        prayerTableController.setEntry(prayerTimes.todayEntry);
        infoPanelController.setPrayerTimes(prayerTimes);
      });
    }

    for (const panel of panels) {
      panel.update?.(now);
    }
  }

  tick();
  // Single master interval drives every panel's per-second update — avoids
  // per-panel timers accumulating over a multi-week unattended runtime.
  window.setInterval(tick, 1000);

  // Re-sync immediately if the tab was throttled/backgrounded, so the
  // display never visibly lags behind the wall clock after resuming.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });
  window.addEventListener("focus", tick);

  scheduleReload(config);
}

main().catch((err) => {
  console.error("[bulletin-board] Failed to start:", err);
  document.body.innerHTML = `<pre style="padding:2rem;color:#900;">Failed to load bulletin board: ${err.message}</pre>`;
});
