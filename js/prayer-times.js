// Loads data/prayer-times.json and provides lookups for "today"/"tomorrow"
// (with graceful fallback to the most recent prior entry) plus next-prayer
// countdown calculation.

export const PRAYER_ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

// Which of the above count as "prayers" for next-prayer countdown purposes
// (sunrise/ishraq are informational only).
const COUNTDOWN_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABELS = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  ishraq: "Ishraq",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export async function loadPrayerTimes(url = "data/prayer-times.json") {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  const json = await res.json();
  // Keep entries sorted by date so "most recent prior" lookups are simple.
  json.entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return json;
}

/**
 * Resolve the entry for `dateKey` (YYYY-MM-DD). If missing, falls back to the
 * most recent entry on or before that date, rather than crashing — this
 * covers "the user hasn't updated the file for this month yet" gracefully.
 * Returns { entry, isExactMatch, isFallback } or null if no entry <= dateKey exists.
 */
export function resolveEntryForDate(data, dateKey) {
  let candidate = null;
  for (const entry of data.entries) {
    if (entry.date === dateKey) {
      return { entry, isExactMatch: true, isFallback: false };
    }
    if (entry.date < dateKey) {
      candidate = entry;
    }
  }
  if (candidate) {
    return { entry: candidate, isExactMatch: false, isFallback: true };
  }
  return null;
}

export function findEntryForDate(data, dateKey) {
  return data.entries.find((e) => e.date === dateKey) ?? null;
}

function timeStringToDate(dateKey, hhmm, timeZone) {
  // Interpret hhmm as a local wall-clock time in `timeZone` on `dateKey`.
  // Since Date has no native "construct in this timezone" API, build via
  // an ISO string and rely on the browser having the timezone offset info
  // through Intl for verification/formatting elsewhere; for countdown math
  // we treat the kiosk's own OS timezone as authoritative (see setup docs:
  // it must match config.json's timezone), so a plain local Date is correct.
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * @returns {{ key: string, label: string, at: Date } | null}
 */
export function getNextPrayer(now, todayEntry, tomorrowEntry, todayDateKey, tomorrowDateKey) {
  if (todayEntry) {
    for (const key of COUNTDOWN_PRAYERS) {
      const slot = todayEntry[key];
      if (!slot?.begins) continue;
      const at = timeStringToDate(todayDateKey, slot.begins, null);
      if (at > now) {
        return { key, label: PRAYER_LABELS[key], at };
      }
    }
  }
  if (tomorrowEntry?.fajr?.begins) {
    const at = timeStringToDate(tomorrowDateKey, tomorrowEntry.fajr.begins, null);
    return { key: "fajr", label: PRAYER_LABELS.fajr, at };
  }
  return null;
}

export function formatCountdown(now, target) {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
