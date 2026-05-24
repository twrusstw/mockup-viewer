// Bundled sample mockups and Chart.js bootstrap. The `__SAMPLE_*` globals are
// inlined at build time by esbuild's `define` (see esbuild.config.mjs); the
// `declare const` blocks below are TypeScript shims so this module compiles
// without referencing globalThis.

declare const __SAMPLE_HELLO__: string
declare const __SAMPLE_WITH_SVG__: string
declare const __SAMPLE_MODAL_DEMO__: string
declare const __SAMPLE_MARKDOWN_VIEW_DEMO__: string
declare const __SAMPLE_SETTINGS_DEMO__: string
declare const __SAMPLE_POPOVER_DEMO__: string
declare const __SAMPLE_SUGGEST_DEMO__: string
declare const __SAMPLE_INPUT_SUGGEST_DEMO__: string

// One realistic demo per Obsidian API class a plugin developer can extend,
// plus hello.html as the intro and with-svg.html as a misc example.
// "Import sample pack" copies these into the configured mockup folder.
export const SAMPLE_PACK: Array<[string, string]> = [
  ['hello.html', __SAMPLE_HELLO__],
  ['with-svg.html', __SAMPLE_WITH_SVG__],
  ['modal-demo.html', __SAMPLE_MODAL_DEMO__],
  ['markdown-view-demo.html', __SAMPLE_MARKDOWN_VIEW_DEMO__],
  ['settings-demo.html', __SAMPLE_SETTINGS_DEMO__],
  ['popover-demo.html', __SAMPLE_POPOVER_DEMO__],
  ['suggest-demo.html', __SAMPLE_SUGGEST_DEMO__],
  ['input-suggest-demo.html', __SAMPLE_INPUT_SUGGEST_DEMO__],
]

// Two ways for a mockup to render Chart.js charts:
//   1. Simple path: <canvas data-chart-config='{"type":"bar", "data":{...}}'></canvas>
//      → this bootstrap auto-wires them. JSON only, no function callbacks.
//   2. Advanced path: write an inline <script> after the canvas and call
//      new Chart(canvas, fullConfig) yourself. Needed when you want
//      formatter / callback functions (tick labels, datalabels, custom colors
//      from CSS variables). The iframe rehydrates user scripts so they run.
export const CHART_BOOTSTRAP = `
;(function () {
  if (typeof Chart === 'undefined') return;
  document.querySelectorAll('canvas[data-chart-config]').forEach(function (c) {
    try {
      var cfg = JSON.parse(c.getAttribute('data-chart-config'));
      new Chart(c, cfg);
    } catch (err) {
      console.error('[mockup-viewer] chart render failed', err);
    }
  });
})();
`

export const EXAMPLE_HTML = `<!-- title:  -->
<!-- viewport: desktop -->
<div>

</div>
`
