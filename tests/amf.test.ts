import { describe, test, expect } from "bun:test";
import { buildAmod, type AmodManifest } from "../scripts/lib/amf";
import { unzipSync, strFromU8 } from "fflate";
import { CANON } from "../scripts/lib/canon";

const manifest: AmodManifest = {
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

describe("buildAmod", () => {
  test("determinista entre builds", () => {
    const content = {
      books: CANON.map((b, i) => ({
        bookId: i + 1,
        osisCode: b.osis,
        name: b.name,
        abbreviation: b.abbrev,
        testament: b.testament,
        bookOrder: i + 1,
        chapterCount: b.chapmax,
      })),
      verses: [
        { bookId: 1, chapter: 1, verse: 1, verseEnd: null, text: "In the beginning God created the heavens and the earth." },
        { bookId: 1, chapter: 1, verse: 2, verseEnd: null, text: "And the earth was waste and empty" },
      ],
    };
    const a = buildAmod(manifest, content);
    const b = buildAmod(manifest, content);
    expect(a.sha256).toBe(b.sha256);
  });

  test("estructura del zip y manifest válido", () => {
    const content = {
      books: CANON.map((b, i) => ({
        bookId: i + 1,
        osisCode: b.osis,
        name: b.name,
        abbreviation: b.abbrev,
        testament: b.testament,
        bookOrder: i + 1,
        chapterCount: b.chapmax,
      })),
      verses: [{ bookId: 1, chapter: 1, verse: 1, verseEnd: null, text: "hola" }],
    };
    const { bytes, sha256 } = buildAmod(manifest, content);
    const entries = unzipSync(bytes);
    expect(Object.keys(entries).sort()).toEqual(["content.db", "manifest.json"]);
    const m = JSON.parse(strFromU8(entries["manifest.json"]));
    expect(m.amf).toBe(1);
    expect(m.license).toBe("PublicDomain");
    const db = entries["content.db"];
    expect(db[0]).toBe(0x53);
    expect(db[1]).toBe(0x51);
    expect(db[2]).toBe(0x4c);
    expect(db[3]).toBe(0x69);
    const appBuf = new Uint8Array(4);
    expect(sha256.length).toBe(64);
  });
});
