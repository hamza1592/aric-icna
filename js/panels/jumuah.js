function formatTime12h(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function mountJumuah(rootEl, { jumuah }) {
  if (!jumuah?.times?.length) {
    rootEl.innerHTML = "";
    return;
  }

  const timesHtml = jumuah.times
    .map(
      (t) => `
        <div class="jumuah-time">
          ${formatTime12h(t.time)}
          <span class="jumuah-label">${t.label ?? ""}</span>
        </div>
      `
    )
    .join("");

  rootEl.innerHTML = `
    <div class="section-title">Jumu'ah</div>
    <div class="jumuah-times">${timesHtml}</div>
  `;
}
