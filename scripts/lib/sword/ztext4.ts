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
  private cache: { idx: number; buf: Buffer } | null = null;
  readonly entryCount: number;

  constructor(vss: Buffer, zdx: Buffer, bzz: Buffer, encoding = "utf8") {
    this.vss = vss;
    this.zdx = zdx;
    this.bzz = bzz;
    this.encoding = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
    this.entryCount = Math.floor(vss.length / 10);
  }

  entryAt(slot: number): ZTextEntry {
    const off = slot * 10;
    if (off + 10 > this.vss.length) return { buffNum: 0, start: 0, size: 0 };
    const buffNum = this.vss.readUInt32LE(off);
    const start = this.vss.readUInt32LE(off + 4);
    const size = this.vss.readUInt16LE(off + 8);
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
