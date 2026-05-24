# Mockup Viewer

A **design-time** tool for plugin authors. Drop a `.html` file into your vault and Mockup Viewer renders it inside an isolated iframe with Obsidian's `app.css`, the active theme, and your plugin CSS all injected — so it looks like the real thing without the build / reload loop.

## Why

Iterating on Obsidian plugin UI is painful:

- Want to try a different modal layout? Write TS, build, reload the plugin, open the modal, see the colour is wrong, change, reload again.
- Plain HTML in Reading mode misses Obsidian's CSS variables, font stack, and host-class selectors. It never looks like the real plugin.
- Want to test mobile UI? Toggling `is-phone` on Obsidian itself breaks the whole app.
- Got an HTML mockup from a designer or AI? You need to eyeball it side-by-side with your real plugin styles, without running the full plugin.

Mockup Viewer solves this:

- Save HTML into `Mockup/foo.html` — the preview appears instantly.
- The iframe boundary keeps `is-phone` / `is-keyboard-open` / your host classes from leaking onto Obsidian's own chrome.
- Obsidian's app.css + your plugin's styles.css are both injected, so visuals are ~1:1 with the real plugin.
- Edits hot-reload (200 ms debounce). Theme switches re-render too.

> **Trust model.** Mockup Viewer executes whatever `<script>` you put in a mockup. **Only open mockups you trust.**

---

## Installation

### Community plugins

Mockup Viewer is not yet listed in Obsidian's community plugins. Use BRAT or manual install below.

### BRAT (beta)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) is a community plugin that installs beta plugins directly from GitHub and keeps them updated.

1. Install the **BRAT** plugin from **Settings → Community plugins → Browse** and enable it
2. Run **BRAT: Add a beta plugin for testing** from the Command Palette
3. Enter the repository: `twrusstw/mockup-viewer`
4. Enable **Mockup Viewer** in **Settings → Community plugins**

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/twrusstw/mockup-viewer/releases/latest)
2. Copy them to `<vault>/.obsidian/plugins/mockup-viewer/`
3. Enable the plugin in **Settings → Community plugins**

Desktop only (`isDesktopOnly: true`).

---

## Getting started

### 1. Open the panel

Command palette → **Mockup Viewer: Open panel**.

The first run shows an empty state with the inspector panel auto-opened on the right.

### 2. Add a stylesheet source

Click **Add source**. Three kinds:

| Kind | Reads from | Use for |
|---|---|---|
| `plugin:<id>` | `.obsidian/plugins/<id>/styles.css` | The plugin you're developing |
| `vault:<path>` | `<vault>/<path>` | Any CSS file inside the vault (drafts, shared styles) |
| `snippet:<name>` | `.obsidian/snippets/<name>.css` | An Obsidian snippet |

Multiple sources allowed. Order matters — later sources override earlier ones via cascade.

### 3. Create a mockup

Create the folder `Mockup/` in your vault (configurable in the panel) and drop `.html` files into it. Minimal example:

```html
<div class="my-card">
  <h2>Hello mockup</h2>
  <p>This text picks up your plugin's .my-card styles.</p>
</div>
```

Save the file — it shows up in the panel's **File** dropdown. Select it and the preview renders.

### 4. Iterate

Edit either the HTML or the source stylesheet — the preview re-renders within 200 ms. No plugin reload needed.

---

## Mockup directives

A `.html` file can start with a contiguous block of HTML comments to control viewport, shell scaffold (`as: modal` / `settings` / etc.), host class, and per-file style sources:

```html
<!-- as: settings -->
<!-- host: my-plugin-settings -->
<!-- viewport: mobile -->
<div class="setting-item">…</div>
```

Full reference (all directives, shell presets, viewport sizes) → [docs/directives.md](docs/directives.md).

---

## Charts

`chart.js` + `chartjs-plugin-datalabels` are bundled into the iframe — wire a canvas with `data-chart-config='{...}'` or use inline `<script>`. Details → [docs/charts.md](docs/charts.md).

---

## The panel

Top to bottom:

- **File** — `.html` file dropdown + Reload button to rescan the folder
- **View source** / **Back to preview** — toggle source view (the mockup HTML + every resolved source side by side)
- **Viewport** — Desktop / Tablet / Mobile segment
- **Body classes** — chips for extra classes on iframe body. Type and press Enter; click × to remove
- **Stylesheet sources** — global sources used when a mockup doesn't have its own `styles:` directive
- **Workspace folder** — vault folder scanned for `.html` files (default `Mockup`)
- **Trust** reminder pinned to the bottom

Click **»** to collapse the panel. A small **«** appears in the host so you can bring it back.

---

## Settings tab

One toggle:

- **Inject Obsidian app.css into iframe** (default on)

Turn this off if a future Obsidian version changes its stylesheet loading mechanism and the mockup breaks. With the toggle off, only your configured sources are injected.

## License

MIT
