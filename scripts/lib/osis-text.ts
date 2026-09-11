const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export interface OsisVerseText {
  text: string;
  headings: string[];
  footnotes: { caller: string; text: string }[];
}

export function osisToText(raw: string): OsisVerseText {
  const headings: string[] = [];
  const footnotes: { caller: string; text: string }[] = [];

  let s = raw;
  s = s.replace(/<title[^>]*>([\s\S]*?)<\/title>/gi, (_m, inner: string) => {
    headings.push(plain(inner));
    return " ";
  });
  s = s.replace(/<note\s([^>]*)>([\s\S]*?)<\/note>/gi, (_m, attrs: string, inner: string) => {
    const n = /(?:^|\s)n="([^"]*)"/.exec(attrs);
    const caller = n ? n[1] : "N";
    if (inner.trim()) footnotes.push({ caller, text: plain(inner) });
    return " ";
  });
  s = s.replace(/<note\s[^>]*\/>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<\/?p[^>]*>/gi, " ");
  s = s.replace(/<\/?(lb|div|chapter|verse)[^>]*>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return { text: plain(s), headings, footnotes };
}

export interface OsisWord {
  /** 1-based: orden de aparición del <w> dentro del versículo */
  position: number;
  /** forma superficial (texto plano dentro del <w>) */
  surface: string;
  /** Strong normalizado (H7225, G3056…) o null */
  strongs: string | null;
  /** lema no-Strong (λόγος…) o null */
  lemma: string | null;
  /** código morfológico tal cual (V-PAI-3S…) o null */
  morph: string | null;
}

export interface OsisVerseWords {
  /** idéntico a osisToText(raw).text: el ETL v1.1 lo verifica por construcción */
  text: string;
  words: OsisWord[];
}

/**
 * Extrae palabras <w lemma morph> estilo WLC/SBLGNT/WHNU (AMF v1.1 §3.7).
 * No altera osisToText: `text` es exactamente el mismo texto plano v1, de modo
 * que reconstruir los .amod v1.0.0 con este código produce los mismos bytes.
 * Estilo <sync type="Strongs"> queda fuera de v1.1 (documentado en la spec).
 */
export function osisToWords(raw: string): OsisVerseWords {
  const text = osisToText(raw).text;
  const words: OsisWord[] = [];
  const re = /<w\s([^>]*?)>([\s\S]*?)<\/w\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const surface = plain(m[2]);
    if (!surface) continue;
    const attrs = parseAttrs(m[1]);
    const lemmaRaw = attrs["lemma"] ?? "";
    let strongs: string | null = null;
    let lemma: string | null = null;
    for (const tok of lemmaRaw.split(/\s+/)) {
      if (!tok) continue;
      const s = normStrong(tok);
      if (s && !strongs) {
        strongs = s;
        continue;
      }
      if (!lemma) lemma = tok;
    }
    const morph = (attrs["morph"] ?? "").trim() || null;
    words.push({ position: words.length + 1, surface, strongs, lemma, morph });
  }
  return { text, words };
}

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z][A-Za-z0-9_-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out[m[1].toLowerCase()] = m[2];
  return out;
}

/** "strong:H07225" | "H07225" | "G3056" → "H7225" | "G3056"; resto → null */
export function normStrong(tok: string): string | null {
  const m = /^(?:strong:)?([HG])0*(\d+)([a-z])?$/i.exec(tok.trim());
  if (!m) return null;
  return `${m[1].toUpperCase()}${m[2]}${(m[3] ?? "").toLowerCase()}`;
}

/**
 * Limpieza opt-in de artefactos de strip de tags ("beginning , God" → "beginning, God").
 * NO se aplica dentro de osisToText: los .amod v1.0.0 publicados deben reconstruir
 * byte-idénticos. Solo módulos nuevos con `textTidy: true` en modules-v1.json (WEB).
 */
export function tidyPunctuation(s: string): string {
  return s
    .replace(/ ([,.;:!?%)\]])/g, "$1")
    .replace(/([(\\[]) /g, "$1")
    .replace(/“ /g, "“")
    .replace(/ ”/g, "”")
    .replace(/\s+/g, " ")
    .trim();
}

function plain(s: string): string {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => safeCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => safeCode(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

function safeCode(code: number): string {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
