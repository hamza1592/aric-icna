// Minimal panel convention so future panels (donation QR, events, ...) can be
// added by registering another { id, mount, update? } without touching the
// core tick loop, clock, or Hijri logic. Only today's two panels are
// registered by app.js today — this file itself adds no new behavior.

export const panels = [];

export function registerPanel(panel) {
  panels.push(panel);
}
