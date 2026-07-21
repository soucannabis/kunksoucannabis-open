/**
 * Parse YAML-like frontmatter (--- ... ---) from a Markdown string.
 * Supports: strings, numbers, booleans, and simple [a, b] arrays.
 */
export function parseFrontmatter(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { data: {}, content: text.trim() };
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) {
    return { data: {}, content: text.trim() };
  }
  const fmBlock = text.slice(3, end).replace(/^\r?\n/, '');
  const content = text.slice(end + 4).replace(/^\r?\n/, '').trim();
  const data = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const valueRaw = trimmed.slice(colon + 1).trim();
    data[key] = parseYamlValue(valueRaw);
  }
  return { data, content };
}

function parseYamlValue(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => unquote(s.trim())).filter(Boolean);
  }
  return unquote(raw);
}

function unquote(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
