import { describe, test, expect, afterAll } from "bun:test";
import { unlinkSync } from "node:fs";
import { Database } from "bun:sqlite";
import { buildAmod, buildContentDb, type AmodManifest } from "../scripts/lib/amf";
import { CANON } from "../scripts/lib/canon";

const tmpDbs: string[] = [];
afterAll(() => {
  for (const p of tmpDbs) {
    try {
      unlinkSync(p);
    } catch {
      /* ya limpio */
    }
  }
});

async function openDb(bytes: Uint8Array): Promise<Database> {
  const path = `${import.meta.dir}/.tmp-words-${tmpDbs.length}.db`;
  await Bun.write(path, bytes);
  tmpDbs.push(path);
  const db = new Database(path, { readonly: true });
  tmpDbs.push(`${path}-journal`);
  return db;
}

function books() {
  return CANON.map((b, i) => ({
    bookId: i + 1,
    osisCode: b.osis,
    name: b.name,
    abbreviation: b.abbrev,
    testament: b.testament,
    bookOrder: i + 1,
    chapterCount: b.chapmax,
  }));
}

const v1: AmodManifest = {
  amf: 1,
  schemaVersion: 1,
  minReaderVersion: 1,
  id: "TEST",
  type: "bible",
  name: "Test Bible",
  shortName: "TST",
  language: "en",
  direction: "ltr",
  version: "1.0.0",
  publisher: "test",
  license: "PublicDomain",
  copyright: "Public Domain",
  source: "https://example.org",
  attribution: "Test, Public Domain",
  features: { hasStrongs: false, hasMorphology: false, hasFootnotes: false, hasHeadings: false },
  dependencies: [],
};

const v2: AmodManifest = {
  ...v1,
  schemaVersion: 2,
  minReaderVersion: 2,
  features: { ...v1.features, hasStrongs: true, hasMorphology: true },
};

const verses = [
  { bookId: 1, chapter: 1, verse: 1, verseEnd: null, text: "In the beginning God created" },
];

const words = [
  { bookId: 1, chapter: 1, verse: 1, position: 2, surface: "beginning", strongs: "H7225", lemma: null, morph: null },
  { bookId: 1, chapter: 1, verse: 1, position: 1, surface: "In", strongs: null, lemma: null, morph: null },
  { bookId: 1, chapter: 1, verse: 1, position: 3, surface: "God", strongs: "H430", lemma: "elohim", morph: "Ncmsc" },
];

describe("words (AMF v1.1)", () => {
  test("v1 no crea tabla words", () => {
    const dbBytes = buildContentDb(v1, { books: books(), verses });
    return openDb(dbBytes).then((db) => {
      const row = db.query("SELECT name FROM sqlite_master WHERE name='words'").get();
      expect(row).toBeNull();
      db.close();
    });
  });

  test("v2 crea words, ordena positions y es determinista", () => {
    const a = buildAmod(v2, { books: books(), verses, words });
    const b = buildAmod(v2, { books: books(), verses, words: [...words].reverse() });
    expect(a.sha256).toBe(b.sha256);
    return openDb(buildContentDb(v2, { books: books(), verses, words })).then((db) => {
      const rows = db.query("SELECT position, surface, strongs FROM words ORDER BY position").all() as {
        position: number;
        surface: string;
        strongs: string | null;
      }[];
      expect(rows.map((r) => r.surface)).toEqual(["In", "beginning", "God"]);
      expect(rows[1].strongs).toBe("H7225");
      expect(rows[2].strongs).toBe("H430");
      const hits = db.query("SELECT surface FROM words WHERE strongs='H430'").all() as { surface: string }[];
      expect(hits).toEqual([{ surface: "God" }]);
      const uv = db.query("PRAGMA user_version").get() as { user_version: number };
      expect(uv.user_version).toBe(2);
      db.close();
    });
  });

  test("words exige schemaVersion 2", () => {
    expect(() => buildAmod(v1, { books: books(), verses, words })).toThrow(/schemaVersion 2/);
  });

  test("words solo en type=bible", () => {
    const dict = { ...v2, type: "dictionary" as const };
    expect(() => buildAmod(dict, { books: books(), words })).toThrow(/solo soportado en type=bible/);
  });

  test("schemaVersion 3 y minReaderVersion dispar quedan rechazados", () => {
    expect(() => buildAmod({ ...v1, schemaVersion: 3 as never, minReaderVersion: 3 as never }, { books: books(), verses })).toThrow(
      /schemaVersion inválido/,
    );
    expect(() => buildAmod({ ...v2, minReaderVersion: 1 as never }, { books: books(), verses })).toThrow(/debe igualar schemaVersion/);
  });

  test("filas inválidas fallan con contexto", () => {
    const bad = [{ bookId: 1, chapter: 1, verse: 1, position: 0, surface: "x", strongs: null, lemma: null, morph: null }];
    expect(() => buildAmod(v2, { books: books(), verses, words: bad })).toThrow(/position|enteros/);
    const badStrongs = [{ bookId: 1, chapter: 1, verse: 1, position: 1, surface: "x", strongs: "XYZ", lemma: null, morph: null }];
    expect(() => buildAmod(v2, { books: books(), verses, words: badStrongs })).toThrow(/strongs inválido/);
  });
});
