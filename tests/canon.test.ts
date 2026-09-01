import { describe, test, expect } from "bun:test";
import { SLOT_COUNT, TOTAL_VERSES, TOTAL_CHAPTERS, CANON, slotFor, REVELATION_LAST_SLOT } from "../scripts/lib/canon";

describe("canon KJV 66 libros", () => {
  test("totales estándar", () => {
    expect(TOTAL_VERSES).toBe(31102);
    expect(TOTAL_CHAPTERS).toBe(1189);
    expect(CANON.length).toBe(66);
  });

  test("invariantes de slots", () => {
    expect(slotFor(0, 1, 1)).toBe(4);
    expect(REVELATION_LAST_SLOT).toBe(SLOT_COUNT - 1);
    expect(SLOT_COUNT).toBe(1 + 2 + 66 + 1189 + 31102 - 1 + 1);
  });

  test("versículos por capítulo conocidos", () => {
    expect(CANON[0].vm[0]).toBe(31);
    expect(CANON[18].vm[118]).toBe(176);
    expect(CANON[65].vm[21]).toBe(21);
  });

  test("osis únicos y orden canónico", () => {
    const oses = new Set(CANON.map((b) => b.osis));
    expect(oses.size).toBe(66);
    expect(CANON[0].osis).toBe("Gen");
    expect(CANON[65].osis).toBe("Rev");
  });
});
