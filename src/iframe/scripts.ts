// Inline <script> rehydration for nodes imported into the iframe document.
//
// DOMParser-built scripts are inert when `doc.importNode`'d — the browser only
// runs scripts that were inserted as freshly-created Script nodes. We rebuild
// each script via `doc.createElement('script')` so the iframe actually executes
// user mockup logic (Chart.js bootstraps, demo handlers, etc).

export function rehydrateScripts(doc: Document, root: Element): void {
  const scripts = root.querySelectorAll('script')
  scripts.forEach(oldScript => {
    const fresh = cloneScript(doc, oldScript)
    oldScript.parentNode?.replaceChild(fresh, oldScript)
  })
}

function cloneScript(doc: Document, original: HTMLScriptElement): HTMLScriptElement {
  const s = doc.createElement('script')
  for (let i = 0; i < original.attributes.length; i++) {
    const attr = original.attributes[i]
    s.setAttribute(attr.name, attr.value)
  }
  s.textContent = original.textContent ?? ''
  return s
}
