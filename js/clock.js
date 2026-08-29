// Live clock + Gregorian date formatting, timezone-aware via Intl.DateTimeFormat
// so the display is correct even if the host OS clock is briefly misconfigured.

export function formatClock(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const time = `${get("hour")}:${get("minute")}:${get("second")}`;
  const period = get("dayPeriod").toUpperCase();
  return { time, period };
}

export function formatGregorianDate(now, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
}

export function dateKeyFor(now, timeZone) {
  // Stable YYYY-MM-DD key in the target timezone, used both to detect
  // midnight rollover and to look up today's prayer-times entry.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}
