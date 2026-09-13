export const APF_TXT_URL = "https://ccel.org/ccel/l/lightfoot/fathers/cache/fathers.txt";
export const CREEDS_TXT_URL = "https://ccel.org/ccel/b/brannan/hstcrcon/cache/hstcrcon.txt";
export const VINCENT_BASE_URL = "https://sacred-texts.com/bib/cmt/vws/";

export const VINCENT_SLUG: Record<string, string> = {
  Matt: "mat", Mark: "mar", Luke: "luk", John: "joh", Acts: "act", Rom: "rom",
  "1Cor": "co1", "2Cor": "co2", Gal: "gal", Eph: "eph", Phil: "phi", Col: "col",
  "1Thess": "th1", "2Thess": "th2", "1Tim": "ti1", "2Tim": "ti2", Titus: "tit",
  Phlm: "phm", Heb: "heb", Jas: "jam", "1Pet": "pe1", "2Pet": "pe2",
  "1John": "jo1", "2John": "jo2", "3John": "jo3", Jude: "jde", Rev: "rev",
};

const VINCENT_BOOK_LABEL: Record<string, string> = {
  Matthew: "Matt", Mark: "Mark", Luke: "Luke", John: "John", Acts: "Acts",
  Romans: "Rom", "1 Corinthians": "1Cor", "2 Corinthians": "2Cor",
  Galatians: "Gal", Ephesians: "Eph", Philippians: "Phil", Colossians: "Col",
  "1 Thessalonians": "1Thess", "2 Thessalonians": "2Thess",
  "1 Timothy": "1Tim", "2 Timothy": "2Tim", Titus: "Titus", Philemon: "Phlm",
  Hebrews: "Heb", James: "Jas", "1 Peter": "1Pet", "2 Peter": "2Pet",
  "1 John": "1John", "2 John": "2John", "3 John": "3John", Jude: "Jude",
  Revelation: "Rev",
};

const APF_MARKERS = [
  "1 Clem.", "2 Clem.", "IgnEph.", "IgnMagn.", "IgnTrall.", "IgnRom.",
  "IgnPhld.", "IgnSmyrn.", "IgnPol.", "PolPhil.", "MartPol.", "Did.",
  "Barn.", "Herm.", "Diogn.",
];

const APF_MARKER_RE = new RegExp(
  "^(" + APF_MARKERS.map((m) => m.replace(/\./g, "\\.")).join("|") + ")\\s*(.*\\S)?\\s*$",
);

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => safeCode(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_m, d: string) => safeCode(parseInt(d, 10)));
  s = s.replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
  return s.replace(/\s+/g, " ").trim();
}

export function txtToText(txt: string): string {
  return txt.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function safeCode(code: number): string {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

export interface VincentVerse {
  verse: number;
  text: string;
}

export function parseVincentChapter(html: string, osis: string, chapter: number): VincentVerse[] {
  const art = html.match(/<article[\s\S]*?<\/article\s*>/i);
  const body = art ? art[0] : html;
  const headerRe = /<p>\s*<a\b[^>]*>([^<]+)<\/a>\s*<\/p>/gi;
  const sections: { verse: number; headerStart: number; contentStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(body)) !== null) {
    const ref = m[1].trim().match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*$/);
    if (!ref) continue;
    const bookOsis = VINCENT_BOOK_LABEL[ref[1].trim()];
    if (bookOsis !== osis || +ref[2] !== chapter) continue;
    sections.push({ verse: +ref[3], headerStart: m.index, contentStart: m.index + m[0].length });
  }
  const merged = new Map<number, string[]>();
  sections.forEach((s, i) => {
    const sliceEnd = i + 1 < sections.length ? sections[i + 1].headerStart : body.length;
    const text = htmlToText(body.slice(s.contentStart, sliceEnd));
    if (!text) return;
    const prev = merged.get(s.verse);
    if (prev) prev.push(text);
    else merged.set(s.verse, [text]);
  });
  return [...merged.entries()]
    .map(([verse, parts]) => ({ verse, text: parts.join(" ") }))
    .sort((a, b) => a.verse - b.verse);
}

export interface CcelEntry {
  key: string;
  content: string;
}

function assertPublicDomain(txt: string, id: string): void {
  if (!/Rights:\s*Public Domain/i.test(txt.slice(0, 4000))) {
    throw new Error(`${id}: la fuente CCEL no declara Rights: Public Domain (sin evidencia, sin publicación)`);
  }
}

function splitCcelSections(txt: string): string[] {
  return txt.replace(/\r/g, "").split(/_{50,}/).map((s) => s.trim()).filter(Boolean);
}

function isFootnoteSection(section: string): boolean {
  return /^\[\d+\]/.test(section);
}

export function parseApf(txt: string): CcelEntry[] {
  assertPublicDomain(txt, "APF");
  const out: CcelEntry[] = [];
  for (const section of splitCcelSections(txt)) {
    if (/^Title:/.test(section)) continue;
    if (/^This document is from/i.test(section)) continue;
    if (isFootnoteSection(section)) continue;
    const lines = section.split("\n");
    let current: { key: string; buf: string[] } | null = null;
    const flush = () => {
      if (!current) return;
      const content = txtToText(current.buf.join("\n"));
      if (content) out.push({ key: current.key, content });
      current = null;
    };
    for (const line of lines) {
      const mk = APF_MARKER_RE.exec(line.trim());
      if (mk) {
        flush();
        current = { key: line.trim().replace(/\s+/g, " "), buf: [] };
      } else if (current) {
        current.buf.push(line);
      }
    }
    flush();
  }
  return out;
}

export function parseCreeds(txt: string): CcelEntry[] {
  assertPublicDomain(txt, "CREEDS");
  const out: CcelEntry[] = [];
  const seen = new Set<string>();
  let doc: string | null = null;
  let head: string | null = null;
  const push = (key: string, body: string) => {
    const content = txtToText(body);
    if (!content) return;
    let k = key;
    let n = 2;
    while (seen.has(k.toLowerCase())) k = `${key} (${n++})`;
    seen.add(k.toLowerCase());
    out.push({ key: k, content });
  };
  for (const section of splitCcelSections(txt)) {
    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const header = lines[0];
    const body = lines.slice(1).join("\n");
    if (/^Title:/.test(header)) continue;
    if (/^Historic Creeds$/.test(header)) continue;
    if (/^Indexes?$/.test(header) || /^Index of Scripture/i.test(header)) continue;
    if (/^This document is from/i.test(header)) continue;
    if (isFootnoteSection(section)) continue;
    let m: RegExpExecArray | null;
    if (/^Apostles' Creed$/.test(header) || /^Nicene Creed$/.test(header) || /^Athanasian Creed$/.test(header)) {
      doc = null;
      push(header, body);
    } else if (/^Introduction$/.test(header)) {
      push(doc === "Heidelberg" ? "Heidelberg Introduction" : "Introduction", body);
    } else if (/^The Heidelberg Catechism$/.test(header)) {
      doc = "Heidelberg";
      push("Heidelberg Catechism", body);
    } else if (/^The (First|Second|Third) Part--/.test(header)) {
      push(`Heidelberg ${header}`, body || header);
    } else if ((m = /^Lord's Day (\d+)$/.exec(header))) {
      push(`Heidelberg Lord's Day ${m[1]}`, body || header);
    } else if ((m = /^Question (\d+)$/.exec(header))) {
      push(`Heidelberg Q${m[1]}`, body);
    } else if (/^The Canons of Dordt$/.test(header)) {
      doc = "Canons";
      head = null;
      push("Canons of Dordt", body);
    } else if ((m = /^(First|Second|Third and Fourth|Fifth) Heads? of Doctrine$/.exec(header))) {
      head = m[1] === "First" ? "I" : m[1] === "Second" ? "II" : m[1] === "Fifth" ? "V" : "III-IV";
      push(`Canons ${head}`, [header, lines[1] ?? ""].join(" — "));
    } else if (/^Rejection of Errors$/.test(header)) {
      push(`Canons ${head} Rejection`, [header, lines[1] ?? ""].join(" — "));
    } else if ((m = /^Paragraph (\d+)$/.exec(header)) && doc === "Canons") {
      push(`Canons ${head} Rej Par ${m[1]}`, body);
    } else if ((m = /^Article (\d+)$/.exec(header)) && doc === "Canons") {
      push(`Canons ${head} Art ${m[1]}`, body);
    } else if (/^Conclusion$/.test(header) && doc === "Canons") {
      push("Canons Conclusion", body);
    } else if (/^The Belgic Confession$/.test(header)) {
      doc = "Belgic";
      head = null;
      push("Belgic Confession", body);
    } else if ((m = /^Article ([IVXLCDM]+)$/.exec(header)) && doc === "Belgic") {
      push(`Belgic Art ${m[1]}`, body);
    } else {
      push(header.length > 90 ? header.slice(0, 90) : header, body || header);
    }
  }
  return out;
}

export function vincentFileName(osis: string, chapter: number): string {
  const slug = VINCENT_SLUG[osis];
  if (!slug) throw new Error(`VINCENT sin slug sacred-texts para ${osis}`);
  return `${slug}${String(chapter).padStart(3, "0")}.htm`;
}
