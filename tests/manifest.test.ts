import { describe, test, expect } from "bun:test";
import { validateManifest, type AmodManifest } from "../scripts/lib/amf";

const base: AmodManifest = {
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

describe("validateManifest", () => {
  test("acepta manifiesto v1 válido", () => {
    expect(() => validateManifest(base)).not.toThrow();
  });

  test("rechaza licencia/copyright/source vacíos", () => {
    expect(() => validateManifest({ ...base, license: "" })).toThrow(/license/);
    expect(() => validateManifest({ ...base, copyright: "" })).toThrow(/copyright/);
    expect(() => validateManifest({ ...base, source: "" })).toThrow(/source/);
  });

  test("rechaza id/type/language/version malformados", () => {
    expect(() => validateManifest({ ...base, id: "minusculas" })).toThrow(/id/);
    expect(() => validateManifest({ ...base, type: "audio" as never })).toThrow(/type/);
    expect(() => validateManifest({ ...base, language: "english" })).toThrow(/language/);
    expect(() => validateManifest({ ...base, version: "1.0" })).toThrow(/version/);
  });
});
