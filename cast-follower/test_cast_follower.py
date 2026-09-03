import datetime as dt
import importlib.util
import pathlib
import unittest
from zoneinfo import ZoneInfo

MODULE_PATH = pathlib.Path(__file__).with_name("cast_follower.py")
SPEC = importlib.util.spec_from_file_location("cast_follower", MODULE_PATH)
cast_follower = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cast_follower)


class FakeMedia:
    def __init__(self, state="IDLE"):
        self.player_state = state
        self.status = self
        self.played = []
        self.stops = 0

    def play_media(self, url, content_type, **kwargs):
        self.played.append((url, content_type, kwargs))
        self.player_state = "PLAYING"

    def block_until_active(self, timeout=None):
        return None

    def stop(self):
        self.stops += 1
        self.player_state = "IDLE"


class FakeCast:
    def __init__(self, state="IDLE", app=None):
        self.media_controller = FakeMedia(state)
        self.app_display_name = app
        self.volumes = []

    def set_volume(self, value):
        self.volumes.append(value)


class CastFollowerTest(unittest.TestCase):
    def test_amsterdam_schedule_including_dst(self):
        utc = ZoneInfo("UTC")
        self.assertFalse(cast_follower.desired(dt.datetime(2026, 1, 15, 5, 59, tzinfo=utc))["play"])
        self.assertTrue(cast_follower.desired(dt.datetime(2026, 1, 15, 6, 0, tzinfo=utc))["play"])
        self.assertFalse(cast_follower.desired(dt.datetime(2026, 7, 15, 4, 59, tzinfo=utc))["play"])
        self.assertTrue(cast_follower.desired(dt.datetime(2026, 7, 15, 5, 0, tzinfo=utc))["play"])
        self.assertFalse(cast_follower.desired(dt.datetime(2026, 7, 15, 21, 0, tzinfo=utc))["play"])

    def test_allowlist_has_no_configurable_url(self):
        self.assertEqual(cast_follower.station_urls("unknown"), ())
        self.assertTrue(all(url.startswith("https://") for url in cast_follower.station_urls("lofigirl")))

    def test_foreign_playback_is_never_stopped_or_replaced(self):
        cast = FakeCast("PLAYING", "Spotify")
        follower = cast_follower.Follower(cast)
        self.assertEqual(follower.reconcile({"play": True, "station": "lofigirl", "volume": 0.45}), "foreign")
        self.assertEqual(cast.media_controller.played, [])
        self.assertEqual(cast.media_controller.stops, 0)

    def test_unowned_default_receiver_is_also_left_alone(self):
        cast = FakeCast("PLAYING", cast_follower.OUR_APP)
        follower = cast_follower.Follower(cast)
        self.assertEqual(follower.reconcile({"play": False, "station": "lofigirl", "volume": 0.45}), "foreign")
        self.assertEqual(cast.media_controller.stops, 0)

    def test_starts_and_stops_only_owned_playback(self):
        cast = FakeCast()
        follower = cast_follower.Follower(cast)
        play = {"play": True, "station": "lofigirl", "volume": 0.45}
        self.assertEqual(follower.reconcile(play), "playing")
        self.assertEqual(cast.volumes, [0.45])
        self.assertEqual(len(cast.media_controller.played), 1)
        self.assertEqual(follower.reconcile({**play, "play": False}), "stopped")
        self.assertEqual(cast.media_controller.stops, 1)


if __name__ == "__main__":
    unittest.main()
