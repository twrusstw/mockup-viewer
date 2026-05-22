interface CssRuleLike {
  cssText: string
  type?: number
  constructor: { name?: string }
}

interface CssStyleSheetLike {
  cssRules: ArrayLike<CssRuleLike> | null
  href?: string | null
}

const CSSRULE_FONT_FACE = 5

export function extractFontFacesFromSheets(sheets: ArrayLike<CssStyleSheetLike>): string {
  const out: string[] = []
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i]
    let rules: ArrayLike<CssRuleLike> | null = null
    try { rules = sheet.cssRules } catch { continue }
    if (!rules) continue
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j]
      const isFontFace =
        rule.type === CSSRULE_FONT_FACE ||
        rule.constructor?.name === 'CSSFontFaceRule' ||
        /^@font-face\b/i.test(rule.cssText)
      if (isFontFace) out.push(rule.cssText)
    }
  }
  return out.join('\n')
}

export function snapshotFontFaces(): string {
  if (typeof document === 'undefined') return ''
  return extractFontFacesFromSheets(document.styleSheets)
}
