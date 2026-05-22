// Forward modifier-key combos from inside the iframe to the outer document
// so Obsidian's hotkey manager (Cmd+P, Cmd+E, etc.) keeps working when the
// iframe has focus. Same-origin iframes don't bubble keydown to the parent,
// so we re-dispatch a clone on the host document.
//
// Skip events whose target is a text-entry element — otherwise Cmd+A / Cmd+C
// would also fire Obsidian's "select all" / "copy" twice while the iframe
// input handles them locally.

export function installHotkeyForwarder(inner: Document, outer: Document): void {
  inner.addEventListener('keydown', (ev) => {
    if (!ev.metaKey && !ev.ctrlKey) return
    if (isTextInput(ev.target)) return

    outer.dispatchEvent(new KeyboardEvent('keydown', {
      key: ev.key,
      code: ev.code,
      ctrlKey: ev.ctrlKey,
      metaKey: ev.metaKey,
      shiftKey: ev.shiftKey,
      altKey: ev.altKey,
      bubbles: true,
      cancelable: true,
    }))
  })
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  return target.isContentEditable
}
