#!/usr/bin/env python3
"""Optional, foreground-only Google Cast fallback for the office speaker group."""

import argparse
import datetime as dt
import logging
import signal
import time
from zoneinfo import ZoneInfo

GROUP_NAME = "Speqckers centrake r"
TIME_ZONE = ZoneInfo("Europe/Amsterdam")
ON_HOUR = 7
OFF_HOUR = 23
VOLUME = 0.45
STATIONS = {
    "lofigirl": (
        "Lofi Girl",
        ("https://esm-lofi-relay.onrender.com/lofi.mp3",),
    ),
}
OUR_APP = "Default Media Receiver"
log = logging.getLogger("esm-cast-fallback")


def desired(now=None):
    """Return the fixed, credential-free office playback intent."""
    current = (now or dt.datetime.now(tz=TIME_ZONE)).astimezone(TIME_ZONE)
    return {
        "play": ON_HOUR <= current.hour < OFF_HOUR,
        "station": "lofigirl",
        "volume": VOLUME,
    }


def station_urls(station):
    """Return only the immutable allowlisted HTTPS URLs for a known station."""
    entry = STATIONS.get(station)
    if not entry:
        return ()
    return tuple(url for url in entry[1] if url.startswith("https://"))


def player_state(cast):
    try:
        return cast.media_controller.status.player_state or "UNKNOWN"
    except Exception:
        return "UNKNOWN"


def foreign_app(cast):
    app = getattr(cast, "app_display_name", None)
    return bool(app) and app != OUR_APP


class Follower:
    """Own only playback this process started and never interrupt another cast."""

    def __init__(self, cast):
        self.cast = cast
        self.owns_playback = False
        self.applied = None

    def reconcile(self, intent):
        state = player_state(self.cast)
        idle = state == "IDLE"
        if foreign_app(self.cast) or (not self.owns_playback and not idle):
            self.owns_playback = False
            self.applied = None
            log.info("another cast is active; stepping aside")
            return "foreign"
        if not intent["play"]:
            if self.owns_playback and not idle:
                self.cast.media_controller.stop()
            self.owns_playback = False
            self.applied = intent
            return "stopped"
        changed = not self.applied or self.applied["station"] != intent["station"]
        if idle or changed:
            urls = station_urls(intent["station"])
            if not urls:
                return "unavailable"
            title = STATIONS[intent["station"]][0]
            self.cast.media_controller.play_media(
                urls[0], "audio/mpeg", title="ESM · " + title, stream_type="LIVE"
            )
            self.cast.media_controller.block_until_active(timeout=15)
            self.cast.set_volume(intent["volume"])
            self.owns_playback = True
        elif self.applied["volume"] != intent["volume"]:
            self.cast.set_volume(intent["volume"])
        self.applied = intent
        return "playing"


class DryRunCast:
    class Media:
        def __init__(self):
            self.player_state = "IDLE"
            self.status = self
        def play_media(self, url, content_type, **kwargs):
            log.info("dry-run play %s", url)
            self.player_state = "PLAYING"
        def block_until_active(self, timeout=None):
            return None
        def stop(self):
            log.info("dry-run stop")
            self.player_state = "IDLE"
    def __init__(self):
        self.media_controller = self.Media()
        self.app_display_name = None
    def set_volume(self, value):
        log.info("dry-run volume %.2f", value)
    def disconnect(self):
        return None


def connect(group_name):
    import pychromecast
    from pychromecast.discovery import stop_discovery
    casts, browser = pychromecast.get_listed_chromecasts(
        friendly_names=[group_name], discovery_timeout=10
    )
    stop_discovery(browser)
    if not casts:
        raise RuntimeError('Cast group not found: "' + group_name + '"')
    cast = casts[0]
    cast.wait(timeout=15)
    return cast


def list_devices():
    import pychromecast
    from pychromecast.discovery import stop_discovery
    casts, browser = pychromecast.get_chromecasts(timeout=10)
    stop_discovery(browser)
    for cast in casts:
        print(cast.name)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", help="exact Google Cast speaker-group name")
    parser.add_argument("--list", action="store_true", help="list visible Cast names and exit")
    parser.add_argument("--dry-run", action="store_true", help="do not discover or control a device")
    parser.add_argument("--once", action="store_true", help="perform one reconciliation and exit")
    parser.add_argument("--interval", type=float, default=30)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if args.list:
        list_devices()
        return 0
    if not args.group:
        parser.error("--group is required")
    if args.interval < 5:
        parser.error("--interval must be at least 5 seconds")
    cast = DryRunCast() if args.dry_run else connect(args.group)
    follower = Follower(cast)
    stopping = {"value": False}
    signal.signal(signal.SIGINT, lambda *_: stopping.__setitem__("value", True))
    signal.signal(signal.SIGTERM, lambda *_: stopping.__setitem__("value", True))
    try:
        while not stopping["value"]:
            follower.reconcile(desired())
            if args.once:
                break
            time.sleep(args.interval)
    finally:
        cast.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
