// Zero-dependency Gregorian -> Hijri conversion using the standard tabular
// (arithmetic) Islamic calendar algorithm. Accurate to within the usual
// +/-1 day uncertainty inherent to any non-moon-sighting-based calculation;
// use `hijriDayOffset` in config.json to hand-correct if needed.

const HIJRI_MONTH_NAMES = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];

function gregorianToJulianDay(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// "Kuwaiti algorithm" tabular Islamic calendar conversion — verified against
// known reference dates (e.g. 2000-01-01 -> 24 Ramadan 1420, 2024-01-01 ->
// 19 Jumada al-Akhirah 1445).
function julianDayToHijri(jd) {
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

/**
 * @param {Date} date - a JS Date representing the local calendar day to convert
 * @param {number} dayOffset - optional +/-1 (or more) day hand-correction
 */
export function gregorianToHijri(date, dayOffset = 0) {
  const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) + dayOffset;
  const { year, month, day } = julianDayToHijri(jd);
  return { year, month, day, monthName: HIJRI_MONTH_NAMES[month - 1] };
}

export function formatHijri(date, dayOffset = 0) {
  const { year, day, monthName } = gregorianToHijri(date, dayOffset);
  return `${day} ${monthName} ${year} AH`;
}
