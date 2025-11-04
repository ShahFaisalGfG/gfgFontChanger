# gfgFontChanger

gfg Font Changer is a lightweight browser extension that helps you change how text appears on websites. It lets you set a custom font, adjust font size (relative delta), and apply a page scaling factor on a per-domain basis. Settings are stored using Chrome's sync storage, so your preferences can follow you across signed-in browsers.

## Features

- Apply a custom font per domain (select from installed system/browser fonts).
- Adjust font size with a relative pixel delta (range: -5 to +5 px) applied idempotently.
- Apply a page scaling factor (e.g., 120%, 90%) per domain.
- Settings are saved to `chrome.storage.sync` under `settingsByDomain` so they persist and can sync across devices.
- Quick reset buttons to remove font/font-size/scaling for the current domain.

## Install (for Chromium-based browsers like Chrome, Edge)

1. Clone or download this repository and keep the extension folder handy.
2. Open the browser and go to: chrome://extensions/ (or edge://extensions/ for Edge).
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the extension folder (the folder that contains `manifest.json`).
5. The extension should appear in the toolbar. Click the icon to open the popup and adjust settings.

Note: This extension uses Manifest V3 and relies on `chrome.scripting` and `chrome.webNavigation` APIs, so it must run in a Chromium-based browser that supports MV3.

## Usage

1. Click the extension icon to open the popup.
2. Select a font from the dropdown and click "Apply Font" to save and apply it for the current domain.
3. Adjust font size (relative) by using the +/- buttons or typing a value between -5 and +5. Click "Apply Font Size" to save and apply.
4. Choose a scaling factor from the dropdown and click "Apply Scaling" to save and apply.
5. To remove a setting for the current domain, use the corresponding "Reset" button. The popup instructs the background script to update open tabs.

Behavior notes:

- Font changes are applied by injecting a style element (`#customFontStyle`) that sets `font-family` globally.
- Font size changes use a stored attribute (`data-gfgfc-original-font-size`) on elements so updates are idempotent and can be restored.
- Scaling is applied by injecting a style element (`#customScalingStyle`) that sets a CSS transform on `html`.

## Where settings are stored

All settings are stored under a single `settingsByDomain` object in `chrome.storage.sync`. Example structure:

```
{
	"settingsByDomain": {
		"example.com": { "font": "SomeFontId", "fontSize": 2, "scaling": 1.2 },
		"another.site": { "fontSize": -1 }
	}
}
```

## Permissions

The extension requests these permissions in `manifest.json`:

- `scripting` — to inject styles and scripts into web pages
- `storage` — to persist user settings (uses `chrome.storage.sync`)
- `tabs`, `webNavigation` — to detect page loads and apply settings per tab
- `fontSettings` — used to enumerate available fonts for the selection list

Privacy: settings remain local (and synced via Chrome if the user is signed in). The extension does not send data to external servers.

## Troubleshooting & Tips

- If the font dropdown is empty, your browser may not expose font names via the `fontSettings` API on your platform (some platforms or permissions can affect this). Try restarting your browser or reinstalling the extension.
- Special pages (chrome://, about:, file:// in some cases) may not allow script injection. The popup falls back to reloading the tab when domain parsing fails.
- If changes don't appear immediately, try reloading the page or clicking the extension's "Apply" button again.
- If a website uses strong CSS specificity or inline styles, the global `font-family` rule is applied with `!important`. Some pages may still override styles for specific elements; you can try a different font or adjust scaling.

## File overview

- `manifest.json` — extension manifest (MV3) and permissions
- `background.js` — service worker: applies settings on navigation, handles resets, and applies settings to open tabs
- `popup.html` / `popup.js` — user interface and storage interaction
- `content.js` — lightweight content script injected into pages (kept minimal)
- `style.css` — popup styles
- `fontsettingbydomainname.txt` — (auxiliary file used by the project; optional)

## Development notes

- The background script listens to `webNavigation.onCompleted` and applies stored settings for the domain on page load.
- When applying font-size deltas, the script stores the computed original size in a `data-gfgfc-original-font-size` attribute to allow resetting.

## Contributing

If you want to contribute improvements (UI, more granular per-element controls, or per-path rules), please open an issue or submit a pull request.

## License

Include your preferred license here (e.g., MIT). If you don't want to include a license, note that others cannot legally reuse the code beyond what fair use allows.

---

Enjoy clearer, more readable web pages with gfg Font Changer. If something doesn't work as you expect, open an issue with details and a reproducible example.
