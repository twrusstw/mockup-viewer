// Stylesheet source resolver.
//
// A source string carries a prefix that determines how to find its CSS:
//   plugin:<id>      → <configDir>/plugins/<id>/styles.css
//   vault:<path>     → <workspaceFolder>/<path>  (workspace-relative)
//                      A leading "/" escapes to vault-root: vault:/foo.css → foo.css
//   snippet:<name>   → <configDir>/snippets/<name>.css
//
// configDir is the Obsidian config folder name (usually `.obsidian`, but
// configurable by the user — caller must pass `app.vault.configDir`).

export type SourceKind = 'plugin' | 'vault' | 'snippet'

export interface StyleSource {
  kind: SourceKind
  ref: string
}

export interface SourceAdapter {
  read(path: string): Promise<string>
  exists(path: string): Promise<boolean>
}

const KIND_RE = /^(plugin|vault|snippet):(.+)$/

export function parseSource(raw: string): StyleSource | null {
  const m = raw.trim().match(KIND_RE)
  if (!m) return null
  const ref = m[2].trim()
  if (!ref) return null
  return { kind: m[1] as SourceKind, ref }
}

export function resolveSourcePath(s: StyleSource, configDir: string, workspaceFolder = ''): string {
  switch (s.kind) {
    case 'plugin': return `${configDir}/plugins/${s.ref}/styles.css`
    case 'snippet': return `${configDir}/snippets/${s.ref}.css`
    case 'vault': {
      if (s.ref.startsWith('/')) return s.ref.slice(1)
      if (!workspaceFolder) return s.ref
      return `${workspaceFolder.replace(/\/+$/, '')}/${s.ref}`
    }
  }
}

export async function readSourceContent(
  adapter: SourceAdapter,
  s: StyleSource,
  configDir: string,
  workspaceFolder = '',
): Promise<{ path: string; content: string }> {
  const path = resolveSourcePath(s, configDir, workspaceFolder)
  if (!(await adapter.exists(path))) {
    throw new Error(`Stylesheet source not found: ${s.kind}:${s.ref} → ${path}`)
  }
  return { path, content: await adapter.read(path) }
}

export async function loadSource(
  adapter: SourceAdapter,
  s: StyleSource,
  configDir: string,
  workspaceFolder = '',
): Promise<string> {
  return (await readSourceContent(adapter, s, configDir, workspaceFolder)).content
}

export function isSourceEditable(kind: SourceKind): boolean {
  return kind === 'vault'
}

export async function loadAllSources(
  adapter: SourceAdapter,
  rawList: string[],
  configDir: string,
  workspaceFolder = '',
): Promise<{ css: string; errors: string[] }> {
  const errors: string[] = []
  const parts: string[] = []
  for (const raw of rawList) {
    const parsed = parseSource(raw)
    if (!parsed) {
      errors.push(`Invalid source format: "${raw}"`)
      continue
    }
    try {
      parts.push(`/* === ${raw} === */\n` + await loadSource(adapter, parsed, configDir, workspaceFolder))
    } catch (err) {
      errors.push((err as Error).message)
    }
  }
  return { css: parts.join('\n\n'), errors }
}
