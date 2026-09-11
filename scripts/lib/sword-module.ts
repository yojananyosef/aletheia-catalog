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

export function loadSwordModule(zipBytes: Uint8Array): SwordModule {
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
    const otReader = new ZTextReader(ot.vss, ot.zdx, ot.bzz, conf.encoding);
    const ntReader = nt ? new ZTextReader(nt.vss, nt.zdx, nt.bzz, conf.encoding) : null;
    const verseAt = (gb: number, chapter: number, verse: number): string => {
      const slot = slotFor(gb, chapter, verse);
      if (slot <= NT_START_OFFSET) return otReader.textAt(otReader.entryAt(slot));
      if (!ntReader) return "";
      return ntReader.textAt(ntReader.entryAt(slot - NT_START_OFFSET - 1));
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
        const inflated = inflateSync(zdtBuf.subarray(zStart, zStart + zSize));
        blockCache = { idx: block, entries: inflated.toString(textEnc).split("\n") };
      }
      const content = blockCache.entries[entryIdx] ?? "";
      if (key) entries.push({ key, content: content.replace(/\0/g, "").replace(/\r/g, "").trim() });
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
  return { verses, sections, footnotes };
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
