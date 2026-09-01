export class RawLd4Reader {
  private dat: Buffer;
  private idx: Buffer;
  private encoding: string;
  readonly entryCount: number;

  constructor(dat: Buffer, idx: Buffer, encoding = "utf8") {
    this.dat = dat;
    this.idx = idx;
    this.encoding = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
    this.entryCount = Math.floor(idx.length / 6);
  }

  entryAt(i: number): { key: string; content: string } | null {
    const off = i * 6;
    if (off + 6 > this.idx.length) return null;
    const start = this.idx.readUInt32LE(off);
    const size = this.idx.readUInt16LE(off + 4);
    if (!size) return null;
    const chunk = this.dat.subarray(start, start + size);
    const text = chunk.toString(this.encoding);
    const nl = text.indexOf("\n");
    if (nl < 0) {
      const nul = text.indexOf("\0");
      const key = nul >= 0 ? text.slice(0, nul) : text;
      return { key: key.trim(), content: nul >= 0 ? text.slice(nul + 1) : "" };
    }
    return { key: text.slice(0, nl).replace(/\0/g, "").trim(), content: text.slice(nl + 1).replace(/\0/g, "").trim() };
  }
}
