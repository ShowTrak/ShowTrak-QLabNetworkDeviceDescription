# ShowTrak QLab Network Device Description

This package adds a custom QLab OSC network device definition for ShowTrak Server.

## Links

- Main repository: [ShowTrakServer](/Users/tk/Documents/Codebase/ShowTrakServer)
- Website: [showtrak.co.uk](https://showtrak.co.uk)

## Included Files

- `ShowTrak Server NDD Demo` (Demo Project)
- `showtrak-server.qlabnetwork` (Network Device Description)

Both files currently contain the same device description content.

## Install into QLab

QLab loads built-in network device descriptions from:

`/Applications/QLab.app/Contents/Resources/NetworkDeviceDescriptions`

### Option A: Finder

1. Quit QLab.
2. In Finder, open `Applications`.
3. Right-click `QLab.app` and choose `Show Package Contents`.
4. Navigate to `Contents/Resources/NetworkDeviceDescriptions`.
5. Copy `showtrak-server.qlabnetwork` from this repository into that folder.
6. Re-open QLab.

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
  - Verify file is in `.../NetworkDeviceDescriptions`.
  - Make sure QLab was fully restarted after install.
  - Confirm filename is unchanged.
- Commands do not trigger behavior in ShowTrak:
  - Check destination IP and UDP port.
  - Confirm ShowTrak Server is running and listening on OSC via the OSC/API Debug Terminal
  - Validate UUID, Group ID, Script ID, or Dummy ID values.

## Notes

- QLab updates will replace app bundle resources. Re-copy `showtrak-server.qlabnetwork` after updating QLab.
- Keep this repository file as your source of truth for future edits.