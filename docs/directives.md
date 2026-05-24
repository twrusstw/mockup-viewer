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
| `as` | one of the 7 shell presets (see below) | Wrap the body in a shell scaffold. Default `view` |
| `host` | one class name | Added to the shell's inner content element (so `.my-host .my-card` selectors match) |
| `container` | one class name | Added to the shell's outermost wrapper |
| `viewport` | `desktop` / `tablet` / `mobile` / `800x600` | Iframe wrapper size. Panel segment overrides this per session |
| `body-class` | space-separated classes | Extra classes on iframe `<body>`. Combines with viewport-derived classes and panel chips |
| `styles` | comma-separated source list | Per-mockup override of the global Settings sources |

## `as` — shell presets

Skip `as` and your body defaults to `view`. Each shell maps to an Obsidian plugin API class a developer extends, and reproduces that class's real DOM nesting so ancestor-dependent selectors and inherited overflow/sizing behave the same as the live app.

| `as` | Maps to | Where your HTML lands | Outer scaffold |
|---|---|---|---|
| `view` | `ItemView` / `FileView` | `.view-content` | `body > .workspace-leaf > .workspace-leaf-content[data-type]` |
| `markdown-view` | `MarkdownView` (reading mode) | `.markdown-preview-sizer` | `.markdown-preview-view.markdown-rendered` + `.markdown-preview-pusher` pre-appended |
| `modal` | `Modal` | `.modal-content` | `.modal-container.mod-dim > .modal-bg + .modal.mod-scrollable` + close button + header |
| `suggest` | `SuggestModal` / `FuzzySuggestModal` | `.suggestion` | `.suggestion-container`; first `.suggestion-item` auto gets `.is-selected` if none |
| `settings` | `PluginSettingTab` | `.vertical-tab-content` | `.modal.mod-sidebar-layout.mod-settings` + placeholder left nav |
| `popover` | `HoverPopover` | `.markdown-embed-content` | `.popover.hover-popover > .markdown-embed` |
| `input-suggest` | `AbstractInputSuggest` | `.suggestion` | sample `<input>` + `.suggestion-container` rendered inline below it (real Obsidian floats this absolutely via JS portal; mockup approximates the visual) |

`host` goes on the innermost element. For example, `as: settings` + `host: my-settings` puts `my-settings` on `.vertical-tab-content`, so you can write `.my-settings .setting-item` selectors.

## Viewport details

| Value | Iframe size | Auto-added body class |
|---|---|---|
| `desktop` | full-bleed | — |
| `tablet` | 1024 × 1366 | — |
| `mobile` | 430 × 932 | `is-phone` |
| `800x600` (custom WxH) | exact | — |

The panel's Desktop / Tablet / Mobile buttons **override** the directive viewport, until you switch to another file (which resets to that file's directive).
