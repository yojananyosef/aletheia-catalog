import { inflateSync } from "node:zlib";

export interface ZTextEntry {
  buffNum: number;
  start: number;
  size: number;
}

export class ZTextReader {
  private vss: Buffer;
  private zdx: Buffer;
  private bzz: Buffer;
  private encoding: BufferEncoding;
  private entrySize: 10 | 12;
  private cache: { idx: number; buf: Buffer } | null = null;
  readonly entryCount: number;

  /**
   * @param entrySize 10 para zText/zText4 (block u32 + offset u32 + size u16),
   *   12 para zCom/zCom4 (size u32: los comentarios superan 64KB por entrada).
   */
  constructor(vss: Buffer, zdx: Buffer, bzz: Buffer, encoding = "utf8", entrySize: 10 | 12 = 10) {
    this.vss = vss;
    this.zdx = zdx;
    this.bzz = bzz;
    this.encoding = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
    this.entrySize = entrySize;
    if (vss.length % entrySize !== 0)
      throw new Error(`vss length ${vss.length} no es múltiplo de entrySize ${entrySize}`);
    this.entryCount = Math.floor(vss.length / entrySize);
  }

  entryAt(slot: number): ZTextEntry {
    const off = slot * this.entrySize;
    if (off + this.entrySize > this.vss.length) return { buffNum: 0, start: 0, size: 0 };
    const buffNum = this.vss.readUInt32LE(off);
    const start = this.vss.readUInt32LE(off + 4);
    const size = this.entrySize === 12 ? this.vss.readUInt32LE(off + 8) : this.vss.readUInt16LE(off + 8);
    return { buffNum, start, size };
  }

  textAt(entry: ZTextEntry): string {
    if (!entry.size) return "";
    let buf: Buffer;
    if (this.cache && this.cache.idx === entry.buffNum) {
      buf = this.cache.buf;
    } else {
      const zdxOff = entry.buffNum * 12;
      if (zdxOff + 12 > this.zdx.length) return "";
      const compOffset = this.zdx.readUInt32LE(zdxOff);
      const compSize = this.zdx.readUInt32LE(zdxOff + 4);
      const raw = this.bzz.subarray(compOffset, compOffset + compSize);
      buf = inflateSync(raw);
      this.cache = { idx: entry.buffNum, buf };
    }
    if (entry.start >= buf.length) return "";
    const chunk = buf.subarray(entry.start, entry.start + entry.size);
    const nul = chunk.indexOf(0);
    return (nul >= 0 ? chunk.subarray(0, nul) : chunk).toString(this.encoding);
  }
}
