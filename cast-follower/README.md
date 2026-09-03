# ESM cast follower — the speakers obey the same remote as the TVs

A small always-on script for the office network that makes a **Google Cast
speaker or speaker group** (Nest Audio, Nest Mini, Chromecast Audio…) follow
the ESM house config. Pick a station and a volume on `remote.html`, set
**Play on → Google speakers**, push: the group plays it in sync, the TVs go
silent. Auto on/off follows the schedule. That is the whole trick: one
`config.json` steers the TV screens, the paired screen *and* the music.

## What is possible with Google speakers (and what is not)

- Nest speakers have **no shell, no ADB, no sideloading**. Nobody "enters" them.
- What they do expose is the **Cast protocol on the local network**: any device
  on the same Wi-Fi can start/stop playback and set the volume. No login, no
  token — that is also why they belong on the trusted office network, not the
  guest Wi-Fi (anyone on the same network can cast to them).
- Multi-room: put the speakers in a **speaker group** in the Google Home app.
  Google keeps the group sample-accurately in sync. The follower casts to the
  group by its name.
- The TVs cannot join that sync (different buffering), so the music comes from
  either the TVs or the speakers — not both in the same room. `musicOutput`
  in the config decides (`tvs` · `speakers` · `both`).
- The Fire TV / Chromecast sticks on the TVs are a different story: they accept
  **ADB over the network** (Settings → enable developer options + network
  debugging), so an agent can open URLs, set volume and reboot them. This
  script does not need that.

## Run it

Any always-on machine on the office LAN: Raspberry Pi, Mac mini, NAS, the box
that runs Home Assistant. Not a Fire TV stick (no Python), not the cloud (must
see the speakers' LAN).

```bash
pip install pychromecast requests
python3 cast_follower.py --list                       # shows the names on the LAN
python3 cast_follower.py --device "Office speakers"   # the group's name from the Google Home app
```

Flags: `--known-host 192.168.1.40` (skip mDNS, e.g. from Docker or across
VLANs; repeatable), `--volume-scale 0.8` (speakers relatively quieter than the
config volume), `--interval 30`, `--dry-run --once` (no devices; prints what it
would do), `-v`.

As a service (Linux, systemd): edit the device name and user in
`esm-cast-follower.service`, then

```bash
sudo cp esm-cast-follower.service /etc/systemd/system/
sudo systemctl enable --now esm-cast-follower
journalctl -u esm-cast-follower -f
```

## Behaviour

- Reads `config.json` and `assets/stations.json` from the ESM site every 30 s
  (stations.json is generated from `shared.js` on deploy, so the station list
  and mirror URLs are the ones the TVs use).
- `music: true` + `musicOutput: speakers|both` + inside `onTime`–`offTime`
  → cast the station's stream (Default Media Receiver, live stream) at
  `musicVolume`; otherwise stop.
- Volume is only set when the config volume changes or playback (re)starts, so
  a manual "Hey Google, volume 3" survives until the next config change.
- If someone casts something else to the speaker, the follower steps aside and
  resumes when the speaker is idle again.
- Stream dropped (speaker idle while it should play) → next mirror after two
  polls. Site unreachable → keeps the last known config.
- Nothing is written anywhere; the only outbound traffic is two JSON GETs per
  poll to the ESM site, and Cast commands on the LAN.

## Security

The script needs LAN access to the speakers and HTTPS to the ESM site; it holds
no credentials. It validates that stream URLs are `https://`. The exposure to
worry about is the Cast protocol itself (unauthenticated on the LAN), which
exists whether or not this script runs — keep speakers on a trusted VLAN.
