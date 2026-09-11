export interface RawTextBook {
  start: number;
  size: number;
}

export class RawTextReader {
  private data: Buffer;
  private bks: Buffer;
  private cps: Buffer;
  private chapmaxs: number[];
  private encoding: BufferEncoding;

  constructor(data: Buffer, bks: Buffer, cps: Buffer, chapmaxs: number[], encoding = "utf8") {
    this.data = data;
    this.bks = bks;
    this.cps = cps;
    this.chapmaxs = chapmaxs;
    this.encoding = /utf-?8/i.test(encoding) ? "utf8" : "latin1";
  }

  private bookEntry(globalBook: number): RawTextBook {
    const off = globalBook * 8;
    return {
      start: this.bks.readUInt32LE(off),
      size: this.bks.readUInt32LE(off + 4),
    };
  }

  private cpsBase(globalBook: number): number {
    let n = 0;
    for (let i = 0; i < globalBook; i++) n += this.chapmaxs[i] + 1;
    return n;
  }

  verse(globalBook: number, chapter: number, verse: number): string {
    const book = this.bookEntry(globalBook);
    if (!book.size) return "";
    const base = this.cpsBase(globalBook);
    const chStart = this.cps.readUInt32LE((base + chapter - 1) * 4);
    const chEnd = this.cps.readUInt32LE((base + chapter) * 4);
    if (chEnd <= chStart) return "";
    const chunk = this.data.subarray(book.start + chStart, book.start + chEnd);
    const lines = chunk.toString(this.encoding).split(/\r?\n/);
    const line = lines[verse - 1];
    return line ? line.replace(/\0/g, "").trim() : "";
  }
}
