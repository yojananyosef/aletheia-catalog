import { describe, test, expect } from "bun:test";
import { makeZip } from "../scripts/lib/zip";
import { unzipSync, strFromU8 } from "fflate";

describe("makeZip determinista", () => {
  test("mismos bytes ante mismo contenido", () => {
    const enc = new TextEncoder();
    const a = makeZip([
      { name: "manifest.json", data: enc.encode(`{"id":"X"}\n`) },
      { name: "content.db", data: new Uint8Array([1, 2, 3]) },
    ]);
    const b = makeZip([
      { name: "manifest.json", data: enc.encode(`{"id":"X"}\n`) },
      { name: "content.db", data: new Uint8Array([1, 2, 3]) },
    ]);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  test("orden exacto manifest.json + content.db y legible por unzip", () => {
    const enc = new TextEncoder();
    const zip = makeZip([
      { name: "manifest.json", data: enc.encode(`{}`) },
      { name: "content.db", data: new Uint8Array([0x53, 0x51]) },
    ]);
    const entries = unzipSync(zip);
    expect(Object.keys(entries)).toEqual(["manifest.json", "content.db"]);
    expect(strFromU8(entries["manifest.json"])).toBe(`{}`);
  });
});
