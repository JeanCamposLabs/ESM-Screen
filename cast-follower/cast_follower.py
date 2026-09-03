#!/usr/bin/env python3
"""
ESM cast follower — make a Google Cast speaker (or a speaker group) follow the
ESM house config, so the remote that steers the TVs steers the speakers too.

Every 30 s it reads config.json (+ stations.json) from the ESM site and makes
the speaker match:
    music on, output "speakers"/"both", inside the on/off window → cast the
        station's stream at musicVolume
    otherwise → stop
Nothing is sent back to the site and nothing on the speaker is touched beyond
playback and volume. If someone casts something else (Spotify, YouTube…) the
follower steps aside and waits until the speaker is idle again.

Runs on any always-on box on the office LAN (Raspberry Pi, Mac mini, NAS,
Home Assistant host). Nest speakers have no shell/ADB — the Cast protocol on the
local network is the only way in, and that is what this uses.

    pip install pychromecast requests
    python3 cast_follower.py --list                          # what is on the LAN
    python3 cast_follower.py --device "Office speakers"      # a speaker or a group
    python3 cast_follower.py --device "Office speakers" --known-host 192.168.1.40   # no mDNS
    python3 cast_follower.py --device "Office speakers" --dry-run --once            # no devices needed
"""
import argparse
import datetime as dt
import json
import logging
import signal
import sys
import time

SITE = "https://jeancamposlabs.github.io/ESM-Screen/"
FALLBACK_STATIONS = [  # used only if stations.json can't be fetched
    {"id": "lofigirl", "name": "Lofi Girl", "urls": ["https://esm-lofi-relay.onrender.com/lofi.mp3"]},
    {"id": "groovesalad", "name": "Groove Salad", "urls": ["https://ice1.somafm.com/groovesalad-128-mp3", "https://ice2.somafm.com/groovesalad-128-mp3"]},
]
log = logging.getLogger("esm-cast")


# ----------------------------------------------------------------------------
# Pure logic (unit-tested; no network, no devices)
# ----------------------------------------------------------------------------
def to_min(hhmm, default):
    try:
        h, m = str(hhmm).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return default


def in_window(now_min, on_hhmm, off_hhmm):
    """Same rule as the TVs: the day window may wrap past midnight."""
    on, off = to_min(on_hhmm, 7 * 60), to_min(off_hhmm, 23 * 60)
    if on <= off:
        return on <= now_min < off
    return now_min >= on or now_min < off


def desired(cfg, now=None):
    """What the speaker should be doing right now → {"play", "station", "volume"}."""
    cfg = cfg if isinstance(cfg, dict) else {}
    now = now or dt.datetime.now()
    output = cfg.get("musicOutput", "tvs")
    play = bool(cfg.get("music")) and output in ("speakers", "both")
    if play and cfg.get("schedule", True):
        play = in_window(now.hour * 60 + now.minute, cfg.get("onTime", "07:00"), cfg.get("offTime", "23:00"))
    try:
        volume = min(1.0, max(0.0, float(cfg.get("musicVolume", 0.35))))
    except Exception:
        volume = 0.35
    station = cfg.get("musicStation") if isinstance(cfg.get("musicStation"), str) else "lofigirl"
    return {"play": play, "station": station, "volume": round(volume, 2)}


def station_urls(stations, station_id):
    for s in stations or []:
        if s.get("id") == station_id and s.get("urls"):
            return [u for u in s["urls"] if isinstance(u, str) and u.startswith("https://")]
    for s in FALLBACK_STATIONS:
        if s["id"] == station_id:
            return list(s["urls"])
    return []


def station_name(stations, station_id):
    for s in (stations or []) + FALLBACK_STATIONS:
        if s.get("id") == station_id:
            return s.get("name", station_id)
    return station_id


# ----------------------------------------------------------------------------
# Cast plumbing
# ----------------------------------------------------------------------------
class FakeCast:
    """Stand-in for --dry-run: logs what would happen."""
    class _MC:
        def __init__(self):
            self.state = "IDLE"
            self.content = None
        @property
        def status(self):
            return self
        @property
        def player_state(self):
            return self.state
        def play_media(self, url, content_type, **kw):
            log.info("DRY-RUN play %s (%s)", url, kw.get("title"))
            self.state, self.content = "PLAYING", url
        def block_until_active(self, timeout=None):
            pass
        def stop(self):
            log.info("DRY-RUN stop")
            self.state, self.content = "IDLE", None
    class _RC:
        def set_volume(self, v, timeout=10.0):
            log.info("DRY-RUN volume %.2f", v)
            return v
    class _SC:
        def __init__(self):
            self.receiver_controller = FakeCast._RC()
    def __init__(self, name):
        self.name = name
        self.media_controller = FakeCast._MC()
        self.socket_client = FakeCast._SC()
        self.app_display_name = None
    def wait(self, timeout=None):
        pass
    @property
    def is_idle(self):
        return self.media_controller.state == "IDLE"
    def quit_app(self):
        log.info("DRY-RUN quit app")
        self.media_controller.stop()
    def disconnect(self):
        pass


def connect(name, known_hosts=None, dry_run=False):
    if dry_run:
        return FakeCast(name)
    import pychromecast
    from pychromecast.discovery import stop_discovery
    casts, browser = pychromecast.get_listed_chromecasts(friendly_names=[name], known_hosts=known_hosts or None, discovery_timeout=10)
    stop_discovery(browser)
    if not casts:
        raise RuntimeError(f'no Cast device called "{name}" found on this network (try --list, or --known-host <ip>)')
    cast = casts[0]
    cast.wait(timeout=15)
    log.info("connected to %s (%s, %s)", cast.name, cast.model_name, cast.cast_info.host)
    return cast


def list_devices(known_hosts=None):
    import pychromecast
    from pychromecast.discovery import stop_discovery
    casts, browser = pychromecast.get_chromecasts(known_hosts=known_hosts or None, timeout=10)
    stop_discovery(browser)
    if not casts:
        print("no Cast devices found (mDNS blocked? try --known-host <ip>)")
    for c in casts:
        print(f'"{c.name}"  {c.model_name}  {c.cast_info.host}  type={c.cast_type}')


def fetch_json(session, url, timeout=15):
    r = session.get(url, params={"t": int(time.time())}, timeout=timeout, headers={"Cache-Control": "no-cache"})
    r.raise_for_status()
    return r.json()


OUR_APP = "Default Media Receiver"


def someone_else_is_casting(cast):
    app = getattr(cast, "app_display_name", None)
    return bool(app) and app not in (OUR_APP, "Backdrop")


def player_state(cast):
    try:
        return cast.media_controller.status.player_state or "UNKNOWN"
    except Exception:
        return "UNKNOWN"


class Follower:
    def __init__(self, cast, stations, volume_scale=1.0):
        self.cast = cast
        self.stations = stations
        self.volume_scale = volume_scale
        self.applied = None        # last desired state we acted on
        self.url_idx = 0
        self.idle_polls = 0
        self.stepping_aside = False

    def set_volume(self, v):
        v = min(1.0, max(0.0, v * self.volume_scale))
        self.cast.socket_client.receiver_controller.set_volume(v)
        log.info("volume → %.0f%%", v * 100)

    def play(self, station):
        urls = station_urls(self.stations, station)
        if not urls:
            log.warning("no stream URL for station %r — nothing to play", station)
            return False
        url = urls[self.url_idx % len(urls)]
        mc = self.cast.media_controller
        mc.play_media(url, "audio/mpeg", title="ESM · " + station_name(self.stations, station), stream_type="LIVE")
        mc.block_until_active(timeout=15)
        log.info("playing %s ← %s", station_name(self.stations, station), url)
        self.idle_polls = 0
        return True

    def stop(self):
        try:
            if not self.cast.is_idle:
                self.cast.quit_app()
                log.info("stopped")
        except Exception as e:
            log.warning("stop failed: %s", e)

    def reconcile(self, want):
        if someone_else_is_casting(self.cast):
            if not self.stepping_aside:
                log.info("someone else is casting (%s) — stepping aside", self.cast.app_display_name)
            self.stepping_aside = True
            self.applied = None
            return
        if self.stepping_aside:
            log.info("speaker free again — resuming")
            self.stepping_aside = False
        prev = self.applied
        if not want["play"]:
            if prev is None or prev["play"]:
                self.stop()
            self.applied = want
            return
        state = player_state(self.cast)
        station_changed = prev is None or not prev["play"] or prev["station"] != want["station"]
        if station_changed:
            self.url_idx = 0
            if self.play(want["station"]):
                self.set_volume(want["volume"])
            self.applied = want
            return
        if prev["volume"] != want["volume"]:
            self.set_volume(want["volume"])
        # watchdog: the stream dropped (IDLE) while we should be playing → next mirror
        if state in ("IDLE", "UNKNOWN"):
            self.idle_polls += 1
            if self.idle_polls >= 2:
                self.url_idx += 1
                log.warning("stream idle — retrying with the next mirror")
                self.play(want["station"])
        else:
            self.idle_polls = 0
        self.applied = want


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--device", help='friendly name of the speaker or speaker group (as in the Google Home app)')
    ap.add_argument("--list", action="store_true", help="list Cast devices on the network and exit")
    ap.add_argument("--known-host", action="append", default=[], help="IP of a Cast device (skips mDNS discovery; repeatable)")
    ap.add_argument("--site", default=SITE, help="ESM site base URL (default: %(default)s)")
    ap.add_argument("--interval", type=float, default=30, help="seconds between config checks (default 30)")
    ap.add_argument("--volume-scale", type=float, default=1.0, help="multiply musicVolume for this speaker (e.g. 0.8)")
    ap.add_argument("--dry-run", action="store_true", help="no devices: print what would happen")
    ap.add_argument("--once", action="store_true", help="one reconciliation pass, then exit")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")

    if args.list:
        list_devices(args.known_host)
        return 0
    if not args.device:
        ap.error("--device is required (or --list)")

    import requests
    session = requests.Session()
    site = args.site if args.site.endswith("/") else args.site + "/"
    stations, cfg = [], {}
    cast = None
    stop = {"now": False}
    signal.signal(signal.SIGTERM, lambda *a: stop.__setitem__("now", True))
    signal.signal(signal.SIGINT, lambda *a: stop.__setitem__("now", True))

    follower = None
    while not stop["now"]:
        try:
            if cast is None:
                cast = connect(args.device, args.known_host, args.dry_run)
                follower = Follower(cast, stations, args.volume_scale)
            try:
                stations = fetch_json(session, site + "assets/stations.json")
                follower.stations = stations
            except Exception as e:
                log.debug("stations.json unavailable (%s) — using the last known list", e)
            try:
                cfg = fetch_json(session, site + "config.json")
            except Exception as e:
                log.warning("config.json unavailable (%s) — keeping the last known config", e)
            want = desired(cfg)
            log.debug("want %s", want)
            follower.reconcile(want)
        except Exception as e:
            log.error("cast error: %s — reconnecting in %ss", e, int(args.interval))
            try:
                if cast is not None:
                    cast.disconnect()
            except Exception:
                pass
            cast, follower = None, None
        if args.once:
            break
        for _ in range(int(args.interval * 10)):
            if stop["now"]:
                break
            time.sleep(0.1)
    if cast is not None and not args.dry_run:
        try:
            cast.disconnect()
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
