const ROTATE_SECONDS = 9;

export function mountNotices(rootEl, { notices }) {
  const list = notices ?? [];
  rootEl.innerHTML = `<div class="notice-text" id="notice-text"></div>`;
  const textEl = rootEl.querySelector("#notice-text");

  const state = { list, index: 0, lastSlot: null };
  if (list.length) {
    textEl.textContent = list[0];
  }

  return {
    update(now) {
      if (state.list.length <= 1) return;
      // Derive the rotation slot from wall-clock seconds (not an incrementing
      // counter) so it never drifts and needs no timer of its own.
      const slot = Math.floor(now.getTime() / 1000 / ROTATE_SECONDS);
      if (slot === state.lastSlot) return;
      state.lastSlot = slot;
      state.index = (state.index + 1) % state.list.length;

      textEl.classList.add("is-fading");
      window.setTimeout(() => {
        textEl.textContent = state.list[state.index];
        textEl.classList.remove("is-fading");
      }, 300);
    },
  };
}
