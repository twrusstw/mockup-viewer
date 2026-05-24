# Mockup directives

A `.html` file can start with a **contiguous block** of HTML comments configuring how it's rendered. The block ends at the first non-directive line.

```html
<!-- title: Settings draft -->
<!-- as: settings -->
<!-- host: my-plugin-settings -->
<!-- viewport: desktop -->
<!-- body-class: theme-dark -->
<!-- styles: plugin:my-plugin, vault:Mockup/wip.css -->
<div class="setting-item">…</div>
```

## Full reference

| Directive | Value | Effect |
|---|---|---|
| `title` | any string | Informational; not rendered |
| `as` | `view` / `modal` / `settings` / `popover` / `suggest` | Wrap the body in a shell scaffold (see below). Default `view` |
| `host` | one class name | Added to the shell's inner content element (so `.my-host .my-card` selectors match) |
| `container` | one class name | Added to the shell's outermost wrapper |
| `viewport` | `desktop` / `tablet` / `mobile` / `800x600` | Iframe wrapper size. Panel segment overrides this per session |
| `body-class` | space-separated classes | Extra classes on iframe `<body>`. Combines with viewport-derived classes and panel chips |
| `styles` | comma-separated source list | Per-mockup override of the global Settings sources |

## `as` — shell presets

Skip `as` and your body lands directly on `<body>` (fine for view content). Otherwise the viewer wraps your body in the scaffolding the app uses for that surface, so ancestor-dependent selectors still match:

| `as` | Use for | Where your HTML lands |
|---|---|---|
| `view` | Leaf content, right-side panel | `<body>` |
| `modal` | Confirm / form modal | `.modal-content` (outer `.modal-container > .modal-bg + .modal` + close button + header pre-built) |
| `settings` | Plugin settings tab | `.vertical-tab-content` (full `.modal.mod-sidebar-layout` + placeholder left nav pre-built) |
| `popover` | Hover popover / link preview | `.popover.hover-popover` |
| `suggest` | Suggester / palette | `.suggestion-container > .suggestion` |

`host` goes on the innermost element. For example, `as: settings` + `host: my-settings` puts `my-settings` on `.vertical-tab-content`, so you can write `.my-settings .setting-item` selectors.

## Viewport details

| Value | Iframe size | Auto-added body class |
|---|---|---|
| `desktop` | full-bleed | — |
| `tablet` | 1024 × 1366 | — |
| `mobile` | 430 × 932 | `is-phone` |
| `800x600` (custom WxH) | exact | — |

The panel's Desktop / Tablet / Mobile buttons **override** the directive viewport, until you switch to another file (which resets to that file's directive).
