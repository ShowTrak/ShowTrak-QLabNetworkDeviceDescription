# ShowTrak QLab Network Device Description

This package adds a custom QLab OSC network device definition for ShowTrak Server v3.13+

## Links

- Main repository: [ShowTrakServer](/Users/tk/Documents/Codebase/ShowTrakServer)
- Website: [showtrak.co.uk](https://showtrak.co.uk)

## Included Files

- `ShowTrak Server NDD Demo` (Demo Project)
- `showtrak-server.qlabnetwork` (Network Device Description)

Both files currently contain the same device description content.

## Install into QLab

QLab can load custom network device descriptions from your user Library folder.

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

## Troubleshooting

- Device does not appear in QLab:
  - Verify `showtrak-server.qlabnetwork` is in `~/Library/Application Support/QLab/Network Library`.
  - Make sure QLab was fully restarted after install.
  - Confirm filename is unchanged.
- Commands do not trigger behavior in ShowTrak:
  - Check destination IP and UDP port.
  - Confirm ShowTrak Server is running and listening on OSC via the OSC/API Debug Terminal
  - Validate Client Slug, Group Slug, Tag Slug, Dummy Slug, Script ID, or Event ID values.
  - `Trigger Event` only reaches integrated clients (QLab, etc.); it fails if the target resolves to no integrated clients.
  - Slugs are shown against each entity in ShowTrak Server; clients, monitors and dummies share one slug namespace, groups and tags have their own.