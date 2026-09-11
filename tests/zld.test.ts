import { describe, test, expect } from "bun:test";
import { deflateSync } from "node:zlib";
import { zipSync } from "fflate";
import { loadSwordModule, parseZldBlock } from "../scripts/lib/sword-module";

const ENCODING = "UTF-8";
const DATA_PATH = "./modules/lexdict/zld/devotionals/sme/sme";

/** Construye un bloque zLD inflado: u32LE count + count×(off,size) + datos. Offsets relativos al inicio del bloque. */
function buildZldBlock(texts: string[], enc: BufferEncoding = "utf8"): Buffer {
  const dataBufs = texts.map((t) => Buffer.from(t, enc));
  const dirLen = 4 + texts.length * 8;
  let off = dirLen;
  const dir = Buffer.alloc(dirLen);
  dir.writeUInt32LE(texts.length, 0);
  dataBufs.forEach((b, i) => {
    dir.writeUInt32LE(off, 4 + i * 8);
    dir.writeUInt32LE(b.length, 4 + i * 8 + 4);
    off += b.length;
  });
  return Buffer.concat([dir, ...dataBufs]);
}

function buildZldZip(blocks: string[][]): Uint8Array {
  const conf = [
    "[SME]",
    "DataPath=" + DATA_PATH,
    "ModDrv=zLD",
    "Encoding=" + ENCODING,
    "SourceType=OSIS",
  ].join("\n") + "\n";
  const compressed: Buffer[] = [];
  const zdx = Buffer.alloc(blocks.length * 8);
  let zStart = 0;
  const inflatedBlocks = blocks.map((texts) => buildZldBlock(texts));
  inflatedBlocks.forEach((inf, b) => {
    const comp = Buffer.from(deflateSync(inf));
    compressed.push(comp);
    zdx.writeUInt32LE(zStart, b * 8);
    zdx.writeUInt32LE(comp.length, b * 8 + 4);
    zStart += comp.length;
  });
  const zdt = Buffer.concat(compressed);

  // .dat/.idx: chunk = key + "\r\n" + u32LE block + u32LE entryIdx
  const datChunks: Buffer[] = [];
  const idx = Buffer.alloc(blocks.flat().length * 8);
  let datOff = 0;
  let k = 0;
  const keyFor = (n: number) => `01.0${n + 1}`;
  blocks.forEach((texts, b) => {
    texts.forEach((_, e) => {
      const head = Buffer.from(keyFor(k) + "\r\n", "utf8");
      const tail = Buffer.alloc(8);
      tail.writeUInt32LE(b, 0);
      tail.writeUInt32LE(e, 4);
      const chunk = Buffer.concat([head, tail]);
      datChunks.push(chunk);
      idx.writeUInt32LE(datOff, k * 8);
      idx.writeUInt32LE(chunk.length, k * 8 + 4);
      datOff += chunk.length;
      k++;
    });
  });
  const base = DATA_PATH.replace(/^\.\//, "");
  return zipSync({
    "mods.d/sme.conf": new TextEncoder().encode(conf),
    [`${base}.dat`]: new Uint8Array(Buffer.concat(datChunks)),
    [`${base}.idx`]: new Uint8Array(idx),
    [`${base}.zdx`]: new Uint8Array(zdx),
    [`${base}.zdt`]: new Uint8Array(zdt),
  });
}

describe("zLD binario (u32LE count + directorio offset/size)", () => {
  test("parseZldBlock recorta por offset/size, no por líneas", () => {
    const texts = ["alpha", "line1\nline2", "gamma\0con-nul\r"];
    const inf = buildZldBlock(texts);
    const out = parseZldBlock(inf, ENCODING);
    expect(out).toEqual(["alpha", "line1\nline2", "gammacon-nul"]);
  });

  test("loadSwordModule resuelve claves .dat → bloques .zdt en 2 bloques", () => {
    const block0 = ["contenido-uno-α", "segunda entrada con\nsalto de línea"];
    const block1 = ["tercera entrada"];
    const zip = buildZldZip([block0, block1]);
    const mod = loadSwordModule(zip);
    if (mod.kind !== "dict") throw new Error("esperado dict");
    expect(mod.entries.length).toBe(3);
    expect(mod.entries.map((e) => e.key)).toEqual(["01.01", "01.02", "01.03"]);
    expect(mod.entries.map((e) => e.content)).toEqual([...block0, ...block1]);
  });

  test("latin1: byte 0xE9 decodifica como é", () => {
    const raw = Buffer.concat([
      (() => {
        const d = Buffer.alloc(4 + 8);
        d.writeUInt32LE(1, 0);
        d.writeUInt32LE(12, 4);
        d.writeUInt32LE(3, 8);
        return d;
      })(),
      Buffer.from([0x63, 0xe9, 0x21]), // "cé!" en latin1
    ]);
    expect(parseZldBlock(raw, "Latin-1")).toEqual(["cé!"]);
  });
});
