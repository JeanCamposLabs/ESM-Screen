# Optional LAN Cast fallback

This is a temporary, foreground-only fallback while Google Home cannot expose
the office Assistant speaker group to scripted automations. It holds no Google,
GitHub, or Scale OS credential and reads no remote configuration. The intent is
fixed to Lofi Girl at volume 0.45 from 07:00 to 23:00 Europe/Amsterdam.

It is not installed, auto-started, or enabled by this repository. Do not turn it
into a persistent service without explicit authorization. The preferred final
path remains Google Home automation after its mobile-app prerequisites are
fixed.

Inspect visible device names without changing playback:

```bash
python3 cast_follower.py --list
```

Run one no-device validation:

```bash
python3 cast_follower.py --group "Speqckers centrake r" --dry-run --once
```

An authorized foreground trial on the trusted office LAN requires
`pychromecast` and must name the group explicitly:

```bash
python3 cast_follower.py --group "Speqckers centrake r"
```

The follower uses only its built-in allowlisted HTTPS Lofi Girl relay. It never
stops or replaces playback it did not start. At 23:00, "off" stops only playback
owned by this process; it does not power speakers off.

Tests need no third-party package:

```bash
python3 -m unittest test_cast_follower.py
```
