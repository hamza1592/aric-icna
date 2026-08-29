import { formatClock, formatGregorianDate } from "../clock.js";
import { formatHijri } from "../hijri.js";
import { getNextPrayer, formatCountdown } from "../prayer-times.js";
import { mountJumuah } from "./jumuah.js";
import { mountNotices } from "./notices.js";

export function mountInfoPanel(rootEl, { config, prayerTimes }) {
  rootEl.innerHTML = `
    <div class="clock-block">
      <div class="clock" id="clock-time"></div>
      <div class="date-line" id="clock-date"></div>
    </div>

    <div class="countdown-banner" id="countdown-banner"></div>

    <hr class="divider" />

    <div class="jumuah-block" id="jumuah-block"></div>

    <hr class="divider" />

    <div class="notices-block" id="notices-block"></div>
  `;

  const noticesController = mountNotices(rootEl.querySelector("#notices-block"), config);
  mountJumuah(rootEl.querySelector("#jumuah-block"), config);

  const clockTimeEl = rootEl.querySelector("#clock-time");
  const clockDateEl = rootEl.querySelector("#clock-date");
  const countdownEl = rootEl.querySelector("#countdown-banner");

  const state = { prayerTimes };

  function render(now) {
    const { time, period } = formatClock(now, state.prayerTimes.timezone);
    clockTimeEl.innerHTML = `${time}<span class="clock-period">${period}</span>`;

    const gregorian = formatGregorianDate(now, state.prayerTimes.timezone);
    const hijri = formatHijri(now, config.hijriDayOffset ?? 0);
    clockDateEl.textContent = `${gregorian} · ${hijri}`;

    const next = getNextPrayer(
      now,
      state.prayerTimes.todayEntry,
      state.prayerTimes.tomorrowEntry,
      state.prayerTimes.todayDateKey,
      state.prayerTimes.tomorrowDateKey
    );

    if (next) {
      countdownEl.innerHTML = `${next.label} begins in <span class="countdown-value">${formatCountdown(now, next.at)}</span>`;
    } else {
      countdownEl.textContent = "";
    }

    return next?.key ?? null;
  }

  render(new Date());

  return {
    update(now) {
      render(now);
      noticesController.update(now);
    },
    setPrayerTimes(newPrayerTimes) {
      state.prayerTimes = newPrayerTimes;
    },
    getNextPrayerKey(now) {
      return render(now);
    },
  };
}
