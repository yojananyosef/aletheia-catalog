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
