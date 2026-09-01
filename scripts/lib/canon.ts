import data from "./verse-data.json";

export interface CanonBook {
  name: string;
  osis: string;
  abbrev: string;
  chapmax: number;
  testament: "OT" | "NT";
  vm: number[];
}

interface RawBook {
  name: string;
  osis: string;
  abbrev: string;
  chapmax: number;
  testament: "OT" | "NT";
}

const mk = (books: RawBook[], vmFlat: number[]): CanonBook[] => {
  let p = 0;
  return books.map((b) => {
    const vm = vmFlat.slice(p, p + b.chapmax);
    p += b.chapmax;
    return { ...b, vm };
  });
};

const ot = mk(data.books.filter((b) => b.testament === "OT"), data.vmOT);
const nt = mk(data.books.filter((b) => b.testament === "NT"), data.vmNT);
export const CANON: CanonBook[] = [...ot, ...nt];

export const TOTAL_VERSES = CANON.reduce((s, b) => s + b.vm.reduce((x, v) => x + v, 0), 0);
export const TOTAL_CHAPTERS = CANON.reduce((s, b) => s + b.chapmax, 0);

const precomputed: number[][] = [];
let last = 0;
let ntStartOffset = -1;
last++;
for (const b of CANON) {
  if (b.testament === "NT" && ntStartOffset < 0) {
    ntStartOffset = last;
    last++;
  }
  last++;
  const offs: number[] = [];
  for (let c = 0; c < b.chapmax; c++) {
    last++;
    offs.push(last);
    last += b.vm[c];
  }
  precomputed.push(offs);
}

export const SLOT_COUNT = last + 1;
export const NT_START_OFFSET = ntStartOffset;
export const REVELATION_LAST_SLOT = precomputed[CANON.length - 1][CANON[CANON.length - 1].chapmax - 1] + CANON[CANON.length - 1].vm[CANON[CANON.length - 1].chapmax - 1];

export function slotFor(globalBook: number, chapter: number, verse: number): number {
  return precomputed[globalBook][chapter - 1] + verse;
}

export function bookIndexByOsis(osis: string): number {
  return CANON.findIndex((b) => b.osis === osis);
}
