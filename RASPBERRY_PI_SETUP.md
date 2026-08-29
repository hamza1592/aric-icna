# Raspberry Pi Kiosk Setup

Goal: the Pi boots straight into full-screen Chromium pointed at your hosted
bulletin-board URL, with no visible desktop, no dialogs, no screen blanking,
and automatic recovery from crashes or reboots — reliable enough to leave
running unattended for weeks.

Replace `https://YOUR-URL-HERE` below with wherever you end up hosting the
site (GitHub Pages, your own server, etc.).

## 1. OS choice

**Recommended: Raspberry Pi OS Lite (64-bit)**, using Raspberry Pi Imager.
It's smaller, boots faster, and has no desktop environment overhead — you
boot straight into a minimal X session running only Chromium.

If you're less comfortable with a headless/CLI-only setup, the Desktop image
+ LXDE autostart is an easier-to-debug alternative (you get a real desktop,
VNC, keyboard/mouse if something goes wrong) — the Chromium flags in section
3 are the same either way, only the autostart mechanism differs (an LXDE
`~/.config/lxsession/LXDE-pi/autostart` file instead of the systemd service
in section 4).

**Important:** during setup with Raspberry Pi Imager, use the gear icon /
advanced options to pre-configure Wi-Fi, hostname, SSH, and locale/timezone
so you can head to section 7 without extra steps.

## 2. Force X11 (not Wayland)

Recent Raspberry Pi OS defaults to a Wayland compositor (`labwc`), where
screen-blanking control (section 5) works differently. For this simpler
guide, force X11:

```bash
sudo raspi-config
# Advanced Options -> Wayland -> X11
```

## 3. Install a minimal X session + Chromium

```bash
sudo apt update
sudo apt install --no-install-recommends xserver-xorg xinit x11-xserver-utils chromium-browser
```

## 4. Kiosk launch script

Create `/home/pi/kiosk.sh`:

```bash
#!/bin/bash
set -e

URL="https://YOUR-URL-HERE"

# Disable screen blanking / power saving before Chromium starts.
xset s off
xset -dpms
xset s noblank

# Wait for the site to actually be reachable before launching, so a
# power-outage reboot doesn't get stuck showing Chromium's offline page.
# Retries with backoff for up to ~2 minutes, then launches anyway.
attempt=0
until curl -sf --max-time 5 "$URL" > /dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 24 ]; then
    echo "Network never became reachable after 2 minutes; launching anyway."
    break
  fi
  sleep 5
done

exec chromium-browser \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --incognito \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  --check-for-update-interval=31536000 \
  --no-first-run
```

```bash
chmod +x /home/pi/kiosk.sh
```

Flag notes:
- `--kiosk` — fullscreen, no browser chrome, no tabs.
- `--noerrdialogs` / `--disable-infobars` / `--disable-session-crashed-bubble`
  / `--incognito` — together these prevent the "Chromium didn't shut down
  correctly, restore pages?" and similar dialogs from appearing after every
  power cycle and blocking the display until manually dismissed.
- `--check-for-update-interval=31536000` — stop Chromium's own update-nag
  popups from interrupting the kiosk view (effectively once a year).
- `--overscroll-history-navigation=0 --disable-pinch` — prevent accidental
  gesture navigation if the display is ever touch-capable.

## 5. Autostart X + the kiosk script on boot, with auto-restart on crash

Create `/etc/systemd/system/kiosk.service`:

```ini
[Unit]
Description=Bulletin board kiosk
After=network-online.target
Wants=network-online.target

[Service]
User=pi
Environment=DISPLAY=:0
ExecStart=/usr/bin/startx /usr/bin/xinit /home/pi/kiosk.sh -- -nocursor
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiosk.service
sudo systemctl start kiosk.service
```

`Restart=always` means if Chromium or the X session crashes for any reason,
systemd relaunches the whole kiosk within 5 seconds — this is what makes the
display self-heal without anyone touching it.

## 6. Wait for network at boot

```bash
sudo raspi-config
# System Options -> Network at Boot -> Yes
```

This makes the boot process wait for a network connection before continuing,
which combined with the `curl` retry loop in the kiosk script (section 4)
covers both "network comes up slowly" and "network never comes up" cases.

Prefer a wired Ethernet connection where physically possible — it avoids
Wi-Fi re-association delays after a router reboot. If Wi-Fi is required, set
the country/SSID via `raspi-config` (System Options -> Wireless LAN); the
default `dhcpcd`/`NetworkManager` reconnect behavior is fine.

## 7. Timezone

Set the Pi's timezone to match the `timezone` field used in `config.json`
and `prayer-times.json`:

```bash
sudo timedatectl set-timezone America/Toronto
timedatectl status   # confirm NTP is enabled ("System clock synchronized: yes")
```

The site's clock is rendered using an explicit timezone override in the JS
itself, so it'll display correctly even if this is briefly wrong — but
keeping the OS timezone correct and NTP-synced avoids any subtle mismatch
issues over weeks of uptime.

## 8. Periodic refresh to pick up data edits

The app already reloads itself automatically based on
`config.json`'s `refresh.reloadIntervalMinutes` (default 30) — no extra Pi
configuration needed. It reloads at clean wall-clock boundaries (e.g. always
at :00/:30) rather than a fixed interval from page-load time, so behavior
stays predictable across reboots.

If you'd rather not rely on the JS-driven reload, a plain
`<meta http-equiv="refresh" content="1800">` tag in `index.html` is a
perfectly acceptable simpler alternative — it just reloads on a fixed
countdown from whenever the page happened to load, rather than at aligned
wall-clock boundaries.

## 9. Long-running reliability

**Hardware watchdog** (recovers from a full OS hang, not just a Chromium
crash):

```bash
sudo apt install watchdog
echo "dtparam=watchdog=on" | sudo tee -a /boot/firmware/config.txt
sudo systemctl enable watchdog
sudo systemctl start watchdog
```

**Nightly reboot** (cheap, standard practice for unattended kiosks — clears
any slow memory growth in Chromium's renderer over multiple days, in addition
to writing leak-conscious JS):

```bash
sudo crontab -e
# add:
0 3 * * * /sbin/reboot
```

SD card wear: consider an overlay/read-only root filesystem later if you
want extra durability. Not required for the initial setup.

## 10. Manual QA checklist

- [ ] Power-cycle with network disabled; confirm it eventually loads once
      network becomes available (tests the `curl` retry loop).
- [ ] Leave the display untouched for 30+ minutes; confirm the screen never
      blanks (tests `xset` settings).
- [ ] `ssh` in and run `pkill chromium`; confirm systemd relaunches it within
      a few seconds (tests `Restart=always`).
- [ ] Reboot several times; confirm no crash-restore or update-nag dialogs
      ever appear (tests the kiosk flag set in section 4).
- [ ] Edit `data/prayer-times.json` or `data/config.json` on the hosting
      side; wait for the configured refresh interval; confirm the display
      updates without a manual reload.
- [ ] Let it run for several real days, ideally spanning a local midnight
      (and a DST transition if testing near one); confirm the date, Hijri
      date, and prayer table all advance correctly with no visible drift.
