<div align="center">

<a href="https://showtrak.co.uk"><img src="https://showtrak.co.uk/images/logo.png" alt="ShowTrak for QLab logo" width="128" height="128"></a>

# ShowTrak for QLab

**Control ShowTrak Server straight from QLab cues.**

[Website](https://showtrak.co.uk) · [ShowTrak Server](https://showtrak.co.uk/software/server) · [Discord](https://discord.gg/DACmwsbSGW)

[![macOS][badge-macos]](https://showtrak.co.uk) [![QLab 5][badge-qlab]](https://showtrak.co.uk)

</div>

A QLab network device description for [ShowTrak Server](https://github.com/ShowTrak/ShowTrakServer). Pick
ShowTrak Server as a network patch, then build cues from menus instead of typing OSC.

QLab 5.6.5 and later include ShowTrak Server out of the box. This repository holds the latest
version of the description, with a demo project.

## Key features

- **Wake, run and trigger**: wake machines, run scripts and trigger events on one client, a group, a tag or everything.
- **Show equipment actions**: run actions on monitored devices, such as projector power and shutter, console scenes or media server cues.
- **Kiosk commands**: send commands to FreeKiosk Android tablets.
- **Future-proof device actions**: check types and actions are typed in, so new ones added to ShowTrak Server work without updating this description.

## Supported actions

The description covers every OSC route ShowTrak Server accepts:

| Action | Needs Server |
| --- | --- |
| Client / Group / Tag / All: Wake on LAN, Run Script, Trigger Event | v3.13+ |
| Dummy: Send Heartbeat, Server: Shutdown | v3.13+ |
| Monitor: Run Check Action, no values | v3.21+ |
| Monitor: Run Check Action, with values | v3.35+ |
| FreeKiosk Terminal: Send Command | v3.25.2+ |
| Group / Tag / All Clients: FreeKiosk Command | v3.28.9+ |

### Monitor check actions

A Monitor cue takes the monitor's slug, its check type (e.g. `qsys-core`, `pjlink`) and the action (e.g. `snapshot.load`, `power.on`). ShowTrak Server lists every check type, action and the values each one takes in its OSC reference (OSC/API Debug Terminal).

For an action that takes values, set Values to `Send values` and type them in order, as you would in a custom OSC message: text in double quotes, numbers bare. For example, a Q-SYS `snapshot.load` with bank `Show Scenes`, snapshot 3 and a 2.5 second ramp:

```
"Show Scenes" 3 2.5
```

Each value is sent as an OSC argument (string, integer or float), which ShowTrak Server reads from v3.35. Use `""` to keep an optional value's default, and separate list values such as Analog Way screens with commas (`"1,2"`).

## Included Files

- `ShowTrak Server NDD Demo` (Demo Project)
- `showtrak-server.qlabnetwork` (Network Device Description)
- `Test Show` (a test QLab workspace and the ShowTrak Server show it targets)

### Test Show

`ShowTrak QLab Test.qlab5` has one network cue for every action, numbered by section: `C` single client, `T` tag, `A` all clients, `G` group, `M` monitors (one per check action), `K` FreeKiosk terminal, `D` dummy and `S` server shutdown. `ShowTrak QLab Test.ShowTrak` is the matching show: client `foh-mac`, integrated client `stage-app` (event `go`), group `Stage`, tag `foh`, dummy `stage-dummy`, FreeKiosk terminal `Lobby-Tablet` and one monitor per check type (`<check type>-test`). Its devices all point at `127.0.0.1`, so cues reach the right action but report the device as unreachable unless real equipment is there. The `RunScript` cues expect a script with the ID `QLab_Test`.

## Install into QLab

QLab 5.6.5 and later ship a ShowTrak Server description built in (`General > ShowTrak Server`). This package uses the same layout and menu values (Target, then ID, then Action), so cues made with QLab's copy keep working on this one.

QLab loads its built-in copy first and skips any Network Library file with the same identifier (`com.showtrak.server`), so on those versions the steps below have no effect: the updated description has to ship with QLab. To try it before then, use the dev build (see Regenerating), which installs under its own name.

On older QLab versions, custom network device descriptions load from your user Library folder:

1. In Finder, hold down `Option` and select `Go` > `Library`.
2. Open `Application Support` > `QLab` > `Network Library`.
3. Drag `showtrak-server.qlabnetwork` into the `Network Library` folder.
4. Launch or restart QLab.

## Use in QLab

1. Open your workspace in QLab.
2. Open your QLab preferences with `cmd + ,`
3. Go to Network Outputs
4. Create a New Network Patch with `cmd + n`
5. Under `type` select `General>ShowTrak Server`
6. Enter the `ip` of your ShowTrak Server instance or `127.0.0.1`/`localhost` if running locally
7. Enter the `port` for your ShowTrak Server instance. Default: `3333`
8. Create a network cue with the network patch
9. In the cue's Settings, pick a Target (Single client, Tagged clients, All clients, Group, Monitor, FreeKiosk terminal, Dummy or System), enter its slug, then pick the Action (for a Monitor, type the check type and action; see [Monitor check actions](#monitor-check-actions))

## Troubleshooting

- Device does not appear in QLab:
  - Verify `showtrak-server.qlabnetwork` is in `~/Library/Application Support/QLab/Network Library`.
  - Make sure QLab was fully restarted after install.
  - Confirm filename is unchanged.
- Commands do not trigger behavior in ShowTrak:
  - Check destination IP and UDP port.
  - Confirm ShowTrak Server is running and listening on OSC via the OSC/API Debug Terminal
  - Validate Client Slug, Group Slug, Tag Slug, Dummy Slug, Monitor Slug, Terminal Slug, Script ID, or Event ID values.
  - A check action only works on a Monitor whose check type matches the one typed in the cue (e.g. a `pjlink` action on a PJLink monitor). Check types and action names are case-sensitive.
  - If the server says an action needs a value, set Values to `Send values` and check they are in the order the OSC reference lists them.
  - FreeKiosk commands that apply to one display mode (Reload Page, Clear Cache) are refused by terminals in another mode.
  - `Trigger Event` only reaches integrated clients (QLab, etc.); it fails if the target resolves to no integrated clients.
  - Slugs are shown against each entity in ShowTrak Server; clients, monitors and dummies share one slug namespace, groups and tags have their own.

## Regenerating

`showtrak-server.json` is generated by a script. Monitor check types and actions are typed into cues, so they never need a regenerate; FreeKiosk commands are read from ShowTrak Server's catalogue, so regenerate when one is added:

```sh
# in a built ShowTrakServer checkout (npm run build)
node scripts/generate.js ../ShowTrakServer
```

Existing menu values must never be renamed: QLab saves them in network cues.

To test changes alongside the description QLab ships, build a dev copy:

```sh
node scripts/generate.js --dev ../ShowTrakServer
```

This writes `showtrak-server-dev.qlabnetwork` straight into `~/Library/Application Support/QLab/Network Library`. It appears in QLab as `General > ShowTrak Server (Dev)` with its own identifier (`com.showtrak.server.dev`), and leaves `showtrak-server.json` untouched. Cues made with the dev patch only work while the dev file is installed.

## Part of ShowTrak

| App | What it does |
| --- | --- |
| **[ShowTrak Server](https://showtrak.co.uk/software/server)** | Monitor and control every computer and show device from one screen. |
| **[ShowTrak Client](https://showtrak.co.uk/software/client)** | The lightweight app that lets ShowTrak Server watch and control a computer. |
| **[ShowTrak Timers](https://showtrak.co.uk/software/timers)** | Show timers run from the desk, a Stream Deck, QLab or any browser. |
| **[ShowTrak Portal](https://showtrak.co.uk)** | Show reports, schedules and team collaboration for live productions. |

Find everything at **[showtrak.co.uk](https://showtrak.co.uk)**.

## Support

Questions, ideas or problems? Join the [ShowTrak Discord](https://discord.gg/DACmwsbSGW) or [open an issue](https://github.com/ShowTrak/ShowTrak-QLabNetworkDeviceDescription/issues).

## Licence

ShowTrak for QLab is open source under the [MIT licence](LICENSE).

[badge-macos]: https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white
[badge-qlab]: https://img.shields.io/badge/QLab%205-1D1D1F?style=for-the-badge
