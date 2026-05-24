# Charts (Chart.js)

`chart.js` + `chartjs-plugin-datalabels` are bundled into the iframe. Datalabels is auto-registered.

## Simple: `data-chart-config` JSON

```html
<canvas data-chart-config='{
  "type": "bar",
  "data": { "labels": ["A","B","C"], "datasets": [{ "label":"x", "data":[1,2,3] }] },
  "options": { "responsive": true, "maintainAspectRatio": false }
}'></canvas>
```

After Chart.js loads, the viewer auto-wires every `canvas[data-chart-config]`. **JSON only — no function values.**

## Advanced: inline `<script>`

For tick formatters, datalabels callbacks, dynamic colours from CSS variables:

```html
<canvas id="my-chart"></canvas>
<script>
  new Chart(document.getElementById('my-chart'), {
    type: 'line',
    data: { /* … */ },
    options: {
      scales: { y: { ticks: { callback: (v) => v + 'k' } } },
    },
  });
</script>
```

Inline `<script>` elements run natively — the iframe loads the mockup as a fresh document, so your code executes the same way a browser would parse a standalone page.
