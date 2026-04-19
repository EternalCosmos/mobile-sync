# Mobile Sync

One-way vault sync from PC to Android over local WiFi — no cloud, no account, no cables.

## How it works

- **PC** runs a local HTTP server exposing your vault's files
- **Android** fetches a file manifest, diffs it against local state, and downloads only what changed
- PC is the single source of truth — mobile vault is kept in sync automatically

Both devices must be on the same WiFi network. Obsidian must be open on your PC.

## Installation

### From community plugins
Search for **Mobile Sync** in Obsidian's community plugin browser.

### Manual
1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/EternalCosmos/mobile-sync/releases/latest)
2. Create folder `.obsidian/plugins/mobile-sync/` in your vault
3. Copy both files into that folder
4. Enable the plugin in Obsidian settings

## Setup

### PC
1. Enable the plugin — the server starts automatically on port `27123`
2. Check the status bar for your local address, e.g. `Sync server: running on 192.168.1.105:27123`

### Android
1. Install the plugin in your Android vault the same way
2. Go to **Settings → Mobile Sync**
3. Enter the PC address: `http://192.168.1.105:27123`
4. Tap **Test connection** to verify
5. Use the ribbon sync button or wait for auto-sync on startup

## Settings

### PC
| Setting | Description |
|---|---|
| Server address | Read-only — your current local IP and port |
| Port | Default `27123`, editable |
| Excluded folders | Comma-separated list of folders to skip |

### Android
| Setting | Description |
|---|---|
| PC server address | The address shown in the PC status bar |
| Test connection | Verifies the PC is reachable |

## Notes

- `.obsidian/` is always excluded from sync
- Files present on Android but not on PC are deleted — mobile is read-only
- Sync processes files in batches of 20 to respect Android memory limits
- Only markdown files are synced

## License

MIT
