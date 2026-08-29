import { PRAYER_ORDER, PRAYER_LABELS } from "../prayer-times.js";

const PRAYER_ICONS = {
  fajr: "✧",
  sunrise: "☀",
  dhuhr: "☼",
  asr: "○",
  maghrib: "⌒",
  isha: "☾",
};

function formatTime12h(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { primary: `${hour12}:${String(minute).padStart(2, "0")}`, period };
}

function renderRow(key, entry) {
  const slot = entry[key];
  if (!slot?.begins) return "";

  const begins = formatTime12h(slot.begins);

  let iqamaCell;
  if (key === "sunrise" && entry.ishraq?.begins) {
    const ishraq = formatTime12h(entry.ishraq.begins);
    iqamaCell = `<td><span class="cell-subtitle">Ishraq</span><span class="time-primary">${ishraq.primary}</span><span class="time-secondary">${ishraq.period}</span></td>`;
  } else if (slot.iqama) {
    const iqama = formatTime12h(slot.iqama);
    iqamaCell = `<td><span class="time-primary">${iqama.primary}</span><span class="time-secondary">${iqama.period}</span></td>`;
  } else {
    iqamaCell = `<td><span class="no-iqama">&mdash;</span></td>`;
  }

  return `
    <tr data-prayer="${key}">
      <td>
        <span class="prayer-name">
          <span class="prayer-icon">${PRAYER_ICONS[key] ?? ""}</span>
          ${PRAYER_LABELS[key]}
        </span>
      </td>
      <td><span class="time-primary">${begins.primary}</span><span class="time-secondary">${begins.period}</span></td>
      ${iqamaCell}
    </tr>
  `;
}

export function mountPrayerTable(rootEl, { config, prayerTimes }) {
  rootEl.innerHTML = `
    <div class="prayer-header">
      <img class="logo" src="${config.mosque.logo}" alt="" onerror="this.style.display='none'" />
      <div class="mosque-name">${config.mosque.name}</div>
    </div>

    <table class="prayer-table">
      <thead>
        <tr>
          <th></th>
          <th>Begins</th>
          <th>Iqama</th>
        </tr>
      </thead>
      <tbody id="prayer-table-body"></tbody>
    </table>
  `;

  const state = { entry: prayerTimes.todayEntry, nextPrayerKey: null };
  renderBody(rootEl, state);

  return {
    setEntry(entry) {
      state.entry = entry;
      renderBody(rootEl, state);
    },
    setNextPrayerKey(key) {
      state.nextPrayerKey = key;
      highlightNextPrayer(rootEl, key);
    },
  };
}

function renderBody(rootEl, state) {
  const body = rootEl.querySelector("#prayer-table-body");
  if (!state.entry) {
    body.innerHTML = `<tr><td colspan="3">Prayer times unavailable</td></tr>`;
    return;
  }
  body.innerHTML = PRAYER_ORDER.map((key) => renderRow(key, state.entry)).join("");
  highlightNextPrayer(rootEl, state.nextPrayerKey);
}

function highlightNextPrayer(rootEl, key) {
  rootEl.querySelectorAll("tr[data-prayer]").forEach((row) => {
    row.classList.toggle("is-next-prayer", row.dataset.prayer === key);
  });
}
