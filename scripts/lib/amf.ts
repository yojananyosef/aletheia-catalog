import { createHash } from "node:crypto";
import { Database } from "bun:sqlite";
import { makeZip } from "./zip";

export const AMF_APPLICATION_ID = 0x414d4f44;
export const AMF_MAGIC = "AMOD";

export type AmodType = "bible" | "commentary" | "lexicon" | "dictionary" | "crossref" | "devotion";

export interface AmodManifest {
  amf: 1;
  /** 1 = v1 (solo texto); 2 = v1.1 (añade tabla words en type=bible, §3.7) */
  schemaVersion: 1 | 2;
  /** debe igualar schemaVersion: el reader valida user_version (§6 compat) */
  minReaderVersion: 1 | 2;
  id: string;
  type: AmodType;
  name: string;
  shortName: string;
  language: string;
  direction: "ltr" | "rtl";
  version: string;
  publisher: string;
  license: string;
  copyright: string;
  source: string;
  attribution: string;
  features: {
    hasStrongs: boolean;
    hasMorphology: boolean;
    hasFootnotes: boolean;
    hasHeadings: boolean;
  };
  dependencies: never[];
}

export interface CanonBookRow {
  bookId: number;
  osisCode: string;
  name: string;
  abbreviation: string;
  testament: "OT" | "NT";
  bookOrder: number;
  chapterCount: number;
}

export interface BibleVerseRow {
  bookId: number;
  chapter: number;
  verse: number;
  verseEnd: number | null;
  text: string;
}

export interface SectionRow {
  bookId: number;
  chapter: number;
  beforeVerse: number;
  title: string;
}

export interface FootnoteRow {
  bookId: number;
  chapter: number;
  verse: number;
  caller: string;
  text: string;
}

export interface DictEntryRow {
  key: string;
  sortKey: string;
  strongs: string | null;
  content: string;
}

export interface DevotionEntryRow {
  month: number;
  day: number;
  title: string;
  scripture: string | null;
  content: string;
}

export interface WordRow {
  bookId: number;
  chapter: number;
  verse: number;
  /** 1-based: orden del <w> dentro del versículo (§3.7) */
  position: number;
  surface: string;
  strongs: string | null;
  lemma: string | null;
  morph: string | null;
}

export interface AmodContent {
  books: CanonBookRow[];
  verses?: BibleVerseRow[];
  sections?: SectionRow[];
  footnotes?: FootnoteRow[];
  entries?: (DictEntryRow & { bookId?: number; chapter?: number; verse?: number })[];
  devotions?: DevotionEntryRow[];
  /** solo type=bible con schemaVersion 2 (§3.7); resto de tipos → error */
  words?: WordRow[];
  hasFTS?: boolean;
}

export function validateManifest(m: AmodManifest): void {
  const errors: string[] = [];
  if (!m.id || !/^[A-Z0-9-]+$/.test(m.id)) errors.push("id vacío o inválido (A-Z0-9-)");
  if (!m.name || !m.shortName) errors.push("name/shortName vacíos");
  if (!m.license) errors.push("license obligatoria");
  if (!m.copyright) errors.push("copyright obligatorio");
  if (!m.source) errors.push("source obligatoria");
  if (!m.attribution) errors.push("attribution obligatoria");
  if (!["bible", "commentary", "lexicon", "dictionary", "crossref", "devotion"].includes(m.type))
    errors.push(`type inválido: ${m.type}`);
  if (!["ltr", "rtl"].includes(m.direction)) errors.push(`direction inválida: ${m.direction}`);
  if (m.amf !== 1) errors.push(`amf debe ser 1, recibido: ${m.amf}`);
  if (!Number.isInteger(m.schemaVersion) || m.schemaVersion < 1 || m.schemaVersion > 2)
    errors.push(`schemaVersion inválido: ${m.schemaVersion} (soportado 1..2)`);
  if (!Number.isInteger(m.minReaderVersion) || m.minReaderVersion < 1 || m.minReaderVersion > 2)
    errors.push(`minReaderVersion inválido: ${m.minReaderVersion} (soportado 1..2)`);
  if (m.minReaderVersion !== m.schemaVersion)
    errors.push(
      `minReaderVersion (${m.minReaderVersion}) debe igualar schemaVersion (${m.schemaVersion}): el reader valida user_version (§6)`,
    );
  if (!m.language || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(m.language))
    errors.push(`language inválido (ISO 639-1/3 esperado): ${m.language}`);
  if (!m.version || !/^\d+\.\d+\.\d+/.test(m.version)) errors.push(`version inválida (semver esperado): ${m.version}`);
  for (const k of ["hasStrongs", "hasMorphology", "hasFootnotes", "hasHeadings"] as const) {
    if (typeof m.features?.[k] !== "boolean") errors.push(`features.${k} debe ser boolean`);
  }
  if (!Array.isArray(m.dependencies)) errors.push("dependencies debe ser array (vacío, reservado)");
  else if (m.dependencies.length > 0) errors.push("dependencies debe estar vacío (reservado)");
  if (errors.length) throw new Error(`Manifest inválido para ${m.id ?? "?"}: ${errors.join("; ")}`);
}

function sortKeyOf(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildContentDb(m: AmodManifest, content: AmodContent): Uint8Array {
  const db = new Database(":memory:");
  db.exec("PRAGMA page_size = 8192;");
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
    CREATE TABLE books (
      bookId INTEGER PRIMARY KEY, osisCode TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      abbreviation TEXT NOT NULL, testament TEXT NOT NULL CHECK (testament IN ('OT','NT')),
      bookOrder INTEGER NOT NULL, chapterCount INTEGER NOT NULL
    ) WITHOUT ROWID;
  `);

  const metaRows: [string, string][] = [
    ["id", m.id],
    ["type", m.type],
    ["language", m.language],
    ["name", m.name],
    ["shortName", m.shortName],
    ["license", m.license],
    ["copyright", m.copyright],
    ["source", m.source],
    ["attribution", m.attribution],
  ];
  const insMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  for (const [k, v] of metaRows) insMeta.run(k, v);

  const insBook = db.prepare(
    "INSERT INTO books (bookId, osisCode, name, abbreviation, testament, bookOrder, chapterCount) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const b of content.books ?? []) {
    insBook.run(b.bookId, b.osisCode, b.name, b.abbreviation, b.testament, b.bookOrder, b.chapterCount);
  }

  const wantFTS = content.hasFTS !== false;
  let ftsAvailable = false;

  if (m.type === "bible" || m.type === "commentary") {
    const table = m.type === "bible" ? "verses" : "entries";
    db.exec(`
      CREATE TABLE ${table} (
        bookId INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
        ${m.type === "bible" ? "verseEnd INTEGER," : ""}
        text TEXT NOT NULL,
        UNIQUE (bookId, chapter, verse)
      );
    `);
    if (m.type === "bible") {
      db.exec(`
        CREATE TABLE sections (
          bookId INTEGER NOT NULL, chapter INTEGER NOT NULL, beforeVerse INTEGER NOT NULL,
          title TEXT NOT NULL,
          PRIMARY KEY (bookId, chapter, beforeVerse)
        ) WITHOUT ROWID;
        CREATE TABLE footnotes (
          id INTEGER PRIMARY KEY, bookId INTEGER NOT NULL, chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL, caller TEXT NOT NULL, text TEXT NOT NULL
        );
      `);
    }
    if (wantFTS) {
      try {
        db.exec(`
          CREATE VIRTUAL TABLE ${table}_fts USING fts5(
            text, bookId UNINDEXED, chapter UNINDEXED, verse UNINDEXED${m.type === "bible" ? ", verseEnd UNINDEXED" : ""},
            content='${table}', content_rowid='rowid',
            tokenize='unicode61 remove_diacritics 2'
          );
          CREATE TRIGGER ${table}_ai AFTER INSERT ON ${table} BEGIN
            INSERT INTO ${table}_fts(rowid, text, bookId, chapter, verse${m.type === "bible" ? ", verseEnd" : ""})
            VALUES (new.rowid, new.text, new.bookId, new.chapter, new.verse${m.type === "bible" ? ", new.verseEnd" : ""});
          END;
        `);
        ftsAvailable = true;
      } catch {
        ftsAvailable = false;
      }
    }
    const cols = m.type === "bible" ? "(bookId, chapter, verse, verseEnd, text)" : "(bookId, chapter, verse, text)";
    const ph = m.type === "bible" ? "(?, ?, ?, ?, ?)" : "(?, ?, ?, ?)";
    const insEntry = db.prepare(`INSERT INTO ${table} ${cols} VALUES ${ph}`);
    for (const v of content.verses ?? []) {
      if (m.type === "bible") insEntry.run(v.bookId, v.chapter, v.verse, v.verseEnd ?? null, v.text);
      else insEntry.run(v.bookId, v.chapter, v.verse, v.text);
    }
    if (m.type === "bible") {
      const insSection = db.prepare("INSERT INTO sections (bookId, chapter, beforeVerse, title) VALUES (?, ?, ?, ?)");
      for (const s of content.sections ?? []) insSection.run(s.bookId, s.chapter, s.beforeVerse, s.title);
      const insFoot = db.prepare("INSERT INTO footnotes (bookId, chapter, verse, caller, text) VALUES (?, ?, ?, ?, ?)");
      for (const f of content.footnotes ?? []) insFoot.run(f.bookId, f.chapter, f.verse, f.caller, f.text);
      // AMF v1.1 §3.7: tabla words aditiva. schemaVersion 1 nunca la crea,
      // de modo que los bytes de los .amod v1.0.0 no cambian con este código.
      if (m.schemaVersion >= 2) {
        db.exec(`
          CREATE TABLE words (
            bookId INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
            position INTEGER NOT NULL,
            surface TEXT NOT NULL, strongs TEXT, lemma TEXT, morph TEXT,
            PRIMARY KEY (bookId, chapter, verse, position)
          );
          CREATE INDEX idx_words_strongs ON words(strongs, bookId, chapter, verse) WHERE strongs IS NOT NULL;
          CREATE INDEX idx_words_lemma ON words(lemma, bookId, chapter, verse) WHERE lemma IS NOT NULL;
        `);
        const sorted = [...(content.words ?? [])].sort(
          (a, b) => a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse || a.position - b.position,
        );
        const insWord = db.prepare(
          "INSERT INTO words (bookId, chapter, verse, position, surface, strongs, lemma, morph) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        );
        for (const w of sorted) {
          validateWordRow(m.id, w);
          insWord.run(
            w.bookId, w.chapter, w.verse, w.position, w.surface,
            w.strongs ?? null, w.lemma ?? null, w.morph ?? null,
          );
        }
      }
    }
  } else if (m.type === "dictionary" || m.type === "lexicon") {
    db.exec(`
      CREATE TABLE entries (
        key TEXT PRIMARY KEY, sortKey TEXT NOT NULL, strongs TEXT, content TEXT NOT NULL,
        UNIQUE (sortKey, key)
      );
    `);
    if (wantFTS) {
      try {
        db.exec(`
          CREATE VIRTUAL TABLE entries_fts USING fts5(
            content, content='entries', content_rowid='rowid',
            tokenize='unicode61 remove_diacritics 2'
          );
          CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
            INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
          END;
        `);
        ftsAvailable = true;
      } catch {
        ftsAvailable = false;
      }
    }
    const insEntry = db.prepare("INSERT INTO entries (key, sortKey, strongs, content) VALUES (?, ?, ?, ?)");
    for (const e of content.entries ?? []) {
      insEntry.run(e.key, e.sortKey || sortKeyOf(e.key), e.strongs ?? null, e.content);
    }
  } else if (m.type === "devotion") {
    db.exec(`
      CREATE TABLE entries (
        month INTEGER NOT NULL, day INTEGER NOT NULL, title TEXT NOT NULL,
        scripture TEXT, content TEXT NOT NULL,
        PRIMARY KEY (month, day)
      ) WITHOUT ROWID;
    `);
    const insEntry = db.prepare("INSERT INTO entries (month, day, title, scripture, content) VALUES (?, ?, ?, ?, ?)");
    for (const e of content.devotions ?? []) insEntry.run(e.month, e.day, e.title, e.scripture ?? null, e.content);
  } else {
    throw new Error(`Tipo no soportado: ${m.type}`);
  }

  db.exec(`
    PRAGMA application_id = ${AMF_APPLICATION_ID};
    PRAGMA user_version = ${m.schemaVersion};
    PRAGMA journal_mode = DELETE;
    VACUUM;
  `);
  void ftsAvailable;
  const serialized = db.serialize();
  db.close();
  return new Uint8Array(serialized);
}

function validateWordRow(id: string, w: WordRow): void {
  const where = `${id} words ${w.bookId}:${w.chapter}:${w.verse}#${w.position}`;
  if (![w.bookId, w.chapter, w.verse, w.position].every((n) => Number.isInteger(n) && n >= 1))
    throw new Error(`${where}: bookId/chapter/verse/position deben ser enteros ≥ 1`);
  if (!w.surface || !w.surface.trim()) throw new Error(`${where}: surface vacía`);
  if (w.surface.includes("\0")) throw new Error(`${where}: surface con NUL`);
  if (w.strongs != null && !/^[HG]\d+[a-z]?$/i.test(w.strongs))
    throw new Error(`${where}: strongs inválido (${w.strongs}), esperado H/G + dígitos`);
  for (const k of ["lemma", "morph"] as const) {
    if (w[k] != null && (!w[k].trim() || w[k].includes("\0")))
      throw new Error(`${where}: ${k} vacío o con NUL`);
  }
}

export function buildAmod(m: AmodManifest, content: AmodContent): { bytes: Uint8Array; sha256: string; dbSize: number } {
  validateManifest(m);
  const wordCount = content.words?.length ?? 0;
  if (wordCount > 0) {
    if (m.type !== "bible")
      throw new Error(`Manifest ${m.id}: words solo soportado en type=bible en AMF v1.1 (§3.7)`);
    if (m.schemaVersion < 2 || m.minReaderVersion < 2)
      throw new Error(`Manifest ${m.id}: content.words requiere schemaVersion 2 + minReaderVersion 2`);
  }
  const dbBytes = buildContentDb(m, content);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(m, null, 2) + "\n");
  const zip = makeZip([
    { name: "manifest.json", data: manifestBytes },
    { name: "content.db", data: dbBytes },
  ]);
  return { bytes: zip, sha256: sha256Hex(zip), dbSize: dbBytes.length };
}

export function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
