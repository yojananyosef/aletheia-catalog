import { describe, test, expect } from "bun:test";
import { resolveVssEntrySize } from "../scripts/lib/sword-module";
import { NT_START_OFFSET, SLOT_COUNT } from "../scripts/lib/canon";

// Conteos canónicos KJV66: ot = NT_START_OFFSET+1 = 24115, nt = SLOT_COUNT-NT_START_OFFSET = 8246.
const OT = NT_START_OFFSET + 1;
const NT = SLOT_COUNT - NT_START_OFFSET;

describe("resolveVssEntrySize (zCom 10B vs zCom4 12B)", () => {
  test("TSK (zCom clásico): ot.bzv=24115×10, nt.bzv=8246×10 → 10", () => {
    expect(resolveVssEntrySize("zCom", OT * 10, NT * 10)).toBe(10);
  });

  test("JFB (zCom4): ot.vss=24115×12, nt.vss=8246×12 → 12", () => {
    expect(resolveVssEntrySize("zCom4", OT * 12, NT * 12)).toBe(12);
  });

  test("zText/zText4 siempre 10 con longitudes canónicas", () => {
    expect(resolveVssEntrySize("zText", OT * 10, NT * 10)).toBe(10);
    expect(resolveVssEntrySize("zText4", OT * 10, NT * 10)).toBe(10);
  });

  test("fallback: ModDrv=zCom pero datos de 12B → 12 (cuadra canon)", () => {
    // 24115×12 es divisible por 10 pero el conteo /10 no cuadra con el canon.
    expect(resolveVssEntrySize("zCom", OT * 12, NT * 12)).toBe(12);
  });

  test("fallback: ModDrv=zCom4 pero datos de 10B → 10 (cuadra canon)", () => {
    expect(resolveVssEntrySize("zCom4", OT * 10, NT * 10)).toBe(10);
  });

  test("sin NT (solo OT): zCom → 10, zCom4 → 12", () => {
    expect(resolveVssEntrySize("zCom", OT * 10, null)).toBe(10);
    expect(resolveVssEntrySize("zCom4", OT * 12, null)).toBe(12);
  });

  test("longitudes que no cuadran con nada → primario (el lector emite el error canónico)", () => {
    expect(resolveVssEntrySize("zCom", 123, 456)).toBe(10);
    expect(resolveVssEntrySize("zCom4", 123, 456)).toBe(12);
  });
});
