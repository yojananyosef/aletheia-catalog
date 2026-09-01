import { describe, test, expect } from "bun:test";
import { deflateSync } from "node:zlib";
import { ZTextReader } from "../scripts/lib/sword/ztext4";

function buildFixture(texts: string[], maxPerBlock = 2): { vss: Buffer; zdx: Buffer; bzz: Buffer } {
  const vssEntries: { buffNum: number; start: number; size: number }[] = [];
  const zdxEntries: number[] = [];
  const chunks: Buffer[] = [];
  let bzzLen = 0;

  const blocks: string[][] = [];
  for (let i = 0; i < texts.length; i += maxPerBlock) blocks.push(texts.slice(i, i + maxPerBlock));

  blocks.forEach((blockTexts, blockIdx) => {
    let pos = 0;
    blockTexts.forEach((t, j) => {
      const size = Buffer.byteLength(t, "utf8");
      vssEntries.push({ buffNum: blockIdx, start: pos, size });
      pos += size + (j < blockTexts.length - 1 ? 1 : 0);
    });
    const buf = Buffer.from(blockTexts.join("\n"), "utf8");
    const comp = deflateSync(buf);
    zdxEntries.push(bzzLen, comp.length, buf.length);
    chunks.push(comp);
    bzzLen += comp.length;
  });

  const vss = Buffer.alloc(vssEntries.length * 10);
  vssEntries.forEach((e, i) => {
    vss.writeUInt32LE(e.buffNum, i * 10);
    vss.writeUInt32LE(e.start, i * 10 + 4);
    vss.writeUInt16LE(e.size, i * 10 + 8);
  });
  const zdx = Buffer.alloc(zdxEntries.length * 4);
  zdxEntries.forEach((v, i) => zdx.writeUInt32LE(v, i * 4));
  return { vss, zdx, bzz: Buffer.concat(chunks) };
}

describe("ZTextReader", () => {
  test("lee textos desde bloques zlib", () => {
    const texts = ["In the beginning", "God created", "the heavens", "and the earth"];
    const { vss, zdx, bzz } = buildFixture(texts);
    const r = new ZTextReader(vss, zdx, bzz);
    expect(r.entryCount).toBe(4);
    texts.forEach((t, i) => {
      expect(r.textAt(r.entryAt(i))).toBe(t);
    });
  });

  test("slots fuera de rango devuelven vacío", () => {
    const { vss, zdx, bzz } = buildFixture(["hola"]);
    const r = new ZTextReader(vss, zdx, bzz);
    expect(r.textAt(r.entryAt(5))).toBe("");
  });
});
