import { unzipSync } from "fflate";
import { inflateSync } from "node:zlib";
import { parseSwordConf, type SwordConf } from "./sword/conf";
import { ZTextReader } from "./sword/ztext4";
import { RawTextReader } from "./sword/rawtext";
import { RawLd4Reader } from "./sword/rawld4";
import { osisToText } from "./osis-text";
import { CANON, NT_START_OFFSET, SLOT_COUNT, slotFor, type CanonBook } from "./canon";

export interface SwordBible {
  kind: "bible";
  conf: SwordConf;
  books: CanonBook[];
  verseAt: (globalBook: number, chapter: number, verse: number) => string;
  slotCount: number;
}

export interface SwordLoadOptions {
  /**
   * Desplazamiento de slots de fichero por testamento (defecto 0).
   * Caso real: engweb2025peb (ebible) trae el NT desplazado +1
   * (file(n) = canon(n-1), verificado versículo a versículo:
   * "with you always" en 1101=1100+1, gracia/santos en el último slot).
   */
  otShift?: number;
  ntShift?: number;
}

export interface SwordDict {
  kind: "dict";
  conf: SwordConf;
  entries: { key: string; content: string }[];
}

export type SwordModule = SwordBible | SwordDict;

function decode(buf: Uint8Array, encoding: string): string {
  const enc = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
  return Buffer.from(buf).toString(enc);
}

function pick(files: Record<string, Uint8Array>, candidates: string[]): Uint8Array | null {
  for (const c of candidates) {
    const hit = files[c] ?? files[c.toLowerCase()];
    if (hit) return hit;
  }
  const lc = candidates.map((c) => c.toLowerCase().replace(/^\.\//, ""));
  const keys = Object.keys(files);
  for (const c of lc) {
    const hit = keys.find((k) => k.toLowerCase() === c || k.toLowerCase().endsWith("/" + c));
    if (hit) return files[hit];
  }
  return null;
}

function keys0(prefix: string): string[] {
  const base = prefix.replace(/^\.\//, "").replace(/\/$/, "");
  return [prefix, base, base.toLowerCase()];
}

/**
 * Parsea un bloque zLD/zLD4 inflado.
 *
 * Formato binario (verificado contra SME real de CrossWire):
 *   u32LE count + count×(u32LE offset, u32LE size) + datos.
 * Los offsets son relativos al inicio del bloque (incluida la cabecera).
 * Cada entrada se decodifica con `encoding` (utf8 si el conf dice UTF-8,
 * si no latin1) y se limpia de `\0`/`\r`/espacios como hace loadSwordModule.
 */
export function parseZldBlock(inflated: Buffer, encoding: string): string[] {
  const textEnc: BufferEncoding = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
  if (inflated.length < 4) return [];
  const count = inflated.readUInt32LE(0);
  const dirLen = 4 + count * 8;
  if (dirLen > inflated.length) return [];
  const out: string[] = new Array(count);
  for (let e = 0; e < count; e++) {
    const off = inflated.readUInt32LE(4 + e * 8);
    const size = inflated.readUInt32LE(4 + e * 8 + 4);
    const slice = inflated.subarray(off, off + size);
    out[e] = slice.toString(textEnc).replace(/\0/g, "").replace(/\r/g, "").trim();
  }
  return out;
}

/**
 * Resuelve el stride del índice vss para drivers zText/zCom.
 *
 * Regla: solo zCom4 usa 12B por entrada (size u32: comentarios largos);
 * zCom clásico usa 10B (size u16) como zText/zText4.
 * (Antes zCom también usaba 12B: incorrecto — TSK es 10B:
 * ot.bzv = 241150 = 24115×10, nt.bzv = 82460 = 8246×10.
 * JFB sigue en 12B: ot.vss/12 = 24115, nt.vss/12 = 8246.)
 *
 * Fallback: si los conteos no cuadran con el canon KJV66 con el stride
 * primario, se prueba el otro stride cuando las longitudes son divisibles
 * y los conteos sí cuadran. Si ninguno cuadra se devuelve el primario para
 * que el lector/validador emita el error canónico.
 */
export function resolveVssEntrySize(modDrv: string, otLen: number, ntLen: number | null): 10 | 12 {
  const primary: 10 | 12 = modDrv === "zCom4" ? 12 : 10;
  const alternate: 10 | 12 = primary === 12 ? 10 : 12;
  const fits = (size: 10 | 12): boolean => {
    if (otLen % size !== 0 || (ntLen != null && ntLen % size !== 0)) return false;
    if (otLen / size !== NT_START_OFFSET + 1) return false;
    if (ntLen != null && ntLen / size !== SLOT_COUNT - NT_START_OFFSET) return false;
    return true;
  };
  if (fits(primary)) return primary;
  if (fits(alternate)) return alternate;
  return primary;
}

/**
 * Normaliza claves Strong a estilo `normStrong` de osis-text.ts (G3056, H7225).
 * - Griego (prefijo "G"): "00001" → "G1", "03056" → "G3056", "00031A" → "G31a".
 * - Hebreo (prefijo "H"): "00001\\" → "H1" (RawLD trae backslash final).
 * Devuelve null para la cabecera "00000" y para claves no-Strong
 * (intro "Dictionaries of Hebrew and Greek Words…"): el importador las
 * descarta (documentado en tasks.md, Lote v1.1).
 */
export function normalizeStrongKey(key: string, prefix: "G" | "H"): string | null {
  const t = key.trim();
  const m = prefix === "H" ? /^0*(\d+)([A-Za-z])?\\$/.exec(t) : /^0*(\d+)([A-Za-z])?$/.exec(t);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `${prefix}${num}${(m[2] ?? "").toLowerCase()}`;
}

export function loadSwordModule(zipBytes: Uint8Array, opts: SwordLoadOptions = {}): SwordModule {
  const files = unzipSync(zipBytes);
  const confName = Object.keys(files).find((k) => /^mods\.d\/[^/]+\.conf$/i.test(k));
  if (!confName) throw new Error("No se encontró mods.d/*.conf en el zip SWORD");
  const conf = parseSwordConf(decode(files[confName], "utf8"));
  const dataPath = conf.dataPath.replace(/\/?$/, "/");
  const modDrv = conf.modDrv;

  if (modDrv === "zText4" || modDrv === "zCom4" || modDrv === "zText" || modDrv === "zCom") {
    const prefix = dataPath;
    const vssNames = ["bzv", "vss"];
    const zdxNames = ["bzs", "zdx"];
    const read = (t: "ot" | "nt"): { vss: Buffer; zdx: Buffer; bzz: Buffer } => {
      const vss = pick(files, vssNames.map((n) => prefix + t + "." + n));
      const zdx = pick(files, zdxNames.map((n) => prefix + t + "." + n));
      const bzz = pick(files, [prefix + t + ".bzz"]);
      if (!vss || !zdx || !bzz) throw new Error(`Faltan archivos de datos para ${t} en ${prefix}`);
      return { vss: Buffer.from(vss), zdx: Buffer.from(zdx), bzz: Buffer.from(bzz) };
    };
    const ot = read("ot");
    const ntFiles = pick(files, [...vssNames.map((n) => prefix + "nt." + n)]);
    const nt = ntFiles ? read("nt") : null;
    // zCom clásico (TSK) = 10B; zCom4 (JFB) = 12B, con fallback vs canon.
    const entrySize = resolveVssEntrySize(modDrv, ot.vss.length, nt ? nt.vss.length : null);
    const otReader = new ZTextReader(ot.vss, ot.zdx, ot.bzz, conf.encoding, entrySize);
    const ntReader = nt ? new ZTextReader(nt.vss, nt.zdx, nt.bzz, conf.encoding, entrySize) : null;
    const otShift = opts.otShift ?? 0;
    const ntShift = opts.ntShift ?? 0;
    const verseAt = (gb: number, chapter: number, verse: number): string => {
      const slot = slotFor(gb, chapter, verse);
      if (slot <= NT_START_OFFSET) return otReader.textAt(otReader.entryAt(slot + otShift));
      if (!ntReader) return "";
      return ntReader.textAt(ntReader.entryAt(slot - NT_START_OFFSET - 1 + ntShift));
    };
    const otCount = otReader.entryCount;
    const ntCount = ntReader?.entryCount ?? 0;
    if (otCount !== NT_START_OFFSET + 1 || ntCount !== SLOT_COUNT - NT_START_OFFSET) {
      throw new Error(
        `vss slots (ot=${otCount}, nt=${ntCount}) no cuadran con canon (esperado ot=${NT_START_OFFSET + 1}, nt=${SLOT_COUNT - NT_START_OFFSET})`,
      );
    }
    return { kind: "bible", conf, books: CANON, verseAt, slotCount: SLOT_COUNT };
  }

  if (modDrv === "RawText") {
    const prefix = dataPath;
    const read = (name: string): Buffer => {
      const f = pick(files, [prefix + name]);
      if (!f) throw new Error(`Falta ${prefix}${name} en el zip`);
      return Buffer.from(f);
    };
    const chapmaxs = CANON.map((b) => b.chapmax);
    const readers: Record<string, RawTextReader> = {};
    for (const [t, testBooks] of [
      ["ot", CANON.filter((b) => b.testament === "OT")],
      ["nt", CANON.filter((b) => b.testament === "NT")],
    ] as const) {
      const data = pick(files, [prefix + t]);
      if (!data) continue;
      readers[t] = new RawTextReader(
        Buffer.from(data),
        read(`${t}.bks`),
        read(`${t}.cps`),
        testBooks.map((b) => b.chapmax),
      );
    }
    const verseAt = (gb: number, chapter: number, verse: number): string => {
      const book = CANON[gb];
      const r = readers[book.testament === "OT" ? "ot" : "nt"];
      if (!r) return "";
      const localBook = book.testament === "OT" ? gb : gb - CANON.filter((b) => b.testament === "OT").length;
      return r.verse(localBook, chapter, verse);
    };
    return { kind: "bible", conf, books: CANON, verseAt, slotCount: SLOT_COUNT };
  }

  if (["zld","zld4","rawld4","rawld"].includes(modDrv.toLowerCase())) {
    const prefix = dataPath;
    let dat = pick(files, keys0(prefix).map((p) => p + ".dat"));
    let idx = pick(files, keys0(prefix).map((p) => p + ".idx"));
    const zdx = pick(files, keys0(prefix).map((p) => p + ".zdx"));
    const zdt = pick(files, keys0(prefix).map((p) => p + ".zdt"));

    if (dat && idx && !zdt) {
      const reader = new RawLd4Reader(Buffer.from(dat), Buffer.from(idx), conf.encoding);
      const entries: { key: string; content: string }[] = [];
      for (let i = 0; i < reader.entryCount; i++) {
        const e = reader.entryAt(i);
        if (e && e.key) entries.push(e);
      }
      return { kind: "dict", conf, entries };
    }

    if (!dat || !idx || !zdx || !zdt) throw new Error(`Faltan .dat/.idx/.zdx/.zdt en ${prefix}`);
    const datBuf = Buffer.from(dat);
    const idxBuf = Buffer.from(idx);
    const zdxBuf = Buffer.from(zdx);
    const zdtBuf = Buffer.from(zdt);
    const entries: { key: string; content: string }[] = [];
    let blockCache: { idx: number; entries: string[] } | null = null;
    const textEnc: BufferEncoding = /utf-?8/i.test(conf.encoding) ? "utf8" : "latin1";
    for (let i = 0; i * 8 + 8 <= idxBuf.length; i++) {
      const start = idxBuf.readUInt32LE(i * 8);
      const size = idxBuf.readUInt32LE(i * 8 + 4);
      if (!size) continue;
      const chunk = datBuf.subarray(start, start + size);
      const nl = chunk.indexOf(10);
      if (nl < 0) continue;
      const key = chunk.subarray(0, nl).toString(textEnc).replace(/\0/g, "").trim();
      const rest = chunk.subarray(nl + 1);
      if (rest.length < 8) continue;
      const block = rest.readUInt32LE(0);
      const entryIdx = rest.readUInt32LE(4);
      if (!blockCache || blockCache.idx !== block) {
        const zdxOff = block * 8;
        if (zdxOff + 8 > zdxBuf.length) continue;
        const zStart = zdxBuf.readUInt32LE(zdxOff);
        const zSize = zdxBuf.readUInt32LE(zdxOff + 4);
        const inflated = Buffer.from(inflateSync(zdtBuf.subarray(zStart, zStart + zSize)));
        blockCache = { idx: block, entries: parseZldBlock(inflated, conf.encoding) };
      }
      const content = blockCache.entries[entryIdx] ?? "";
      if (key) entries.push({ key, content });
    }
    return { kind: "dict", conf, entries };
  }

  throw new Error(`ModDrv no soportado en v1: ${modDrv}`);
}

export function extractBibleVerses(mod: SwordBible): {
  verses: { bookId: number; chapter: number; verse: number; text: string }[];
  sections: { bookId: number; chapter: number; beforeVerse: number; title: string }[];
  footnotes: { bookId: number; chapter: number; verse: number; caller: string; text: string }[];
} {
  const verses: { bookId: number; chapter: number; verse: number; text: string }[] = [];
  const sections: { bookId: number; chapter: number; beforeVerse: number; title: string }[] = [];
  const footnotes: { bookId: number; chapter: number; verse: number; caller: string; text: string }[] = [];
  mod.books.forEach((book, gb) => {
    for (let c = 1; c <= book.chapmax; c++) {
      for (let v = 1; v <= book.vm[c - 1]; v++) {
        const raw = mod.verseAt(gb, c, v);
        if (!raw) continue;
        const { text, headings, footnotes: fns } = osisToText(raw);
        for (const h of headings) sections.push({ bookId: gb + 1, chapter: c, beforeVerse: v, title: h });
        for (const f of fns) footnotes.push({ bookId: gb + 1, chapter: c, verse: v, caller: f.caller, text: f.text });
        if (text) verses.push({ bookId: gb + 1, chapter: c, verse: v, text });
      }
    }
  });
  return { verses, sections: mergeSections(sections), footnotes };
}

/**
 * Algunos módulos (WEB) emiten varios <title> antes del mismo versículo
 * (sección mayor + sección). La PK de sections es (bookId, chapter, beforeVerse):
 * se unen con " — " (jerarquía mayor → menor, orden de aparición).
 * Sin duplicados en la fuente el resultado es idéntico al anterior.
 */
function mergeSections(
  sections: { bookId: number; chapter: number; beforeVerse: number; title: string }[],
): { bookId: number; chapter: number; beforeVerse: number; title: string }[] {
  const merged = new Map<string, { bookId: number; chapter: number; beforeVerse: number; title: string }>();
  for (const s of sections) {
    const key = `${s.bookId}:${s.chapter}:${s.beforeVerse}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...s });
      continue;
    }
    const parts = prev.title.split(" — ");
    if (!parts.includes(s.title)) parts.push(s.title);
    prev.title = parts.join(" — ");
  }
  return [...merged.values()];
}

export function extractCommentaryEntries(mod: SwordBible): {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}[] {
  const out: { bookId: number; chapter: number; verse: number; text: string }[] = [];
  mod.books.forEach((book, gb) => {
    for (let c = 1; c <= book.chapmax; c++) {
      for (let v = 1; v <= book.vm[c - 1]; v++) {
        const raw = mod.verseAt(gb, c, v);
        if (!raw) continue;
        const { text } = osisToText(raw);
        if (text) out.push({ bookId: gb + 1, chapter: c, verse: v, text });
      }
    }
  });
  return out;
}
