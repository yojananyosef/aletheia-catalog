import { describe, test, expect } from "bun:test";
import { normalizeStrongKey } from "../scripts/lib/sword-module";
import { normStrong } from "../scripts/lib/osis-text";

describe("normalizeStrongKey", () => {
  test("griego: ceros a la izquierda fuera, prefijo G", () => {
    expect(normalizeStrongKey("00001", "G")).toBe("G1");
    expect(normalizeStrongKey("03056", "G")).toBe("G3056");
    expect(normalizeStrongKey("05463", "G")).toBe("G5463");
  });

  test("griego: sufijo de variante en minúscula (estilo normStrong)", () => {
    expect(normalizeStrongKey("00031A", "G")).toBe("G31a");
    expect(normalizeStrongKey("00292B", "G")).toBe("G292b");
  });

  test("hebreo: backslash final fuera, prefijo H", () => {
    expect(normalizeStrongKey("00001\\", "H")).toBe("H1");
    expect(normalizeStrongKey("03056\\", "H")).toBe("H3056");
    expect(normalizeStrongKey("08674\\", "H")).toBe("H8674");
  });

  test("cabecera 00000 / 00000\\ → null (prefacio, se descarta)", () => {
    expect(normalizeStrongKey("00000", "G")).toBeNull();
    expect(normalizeStrongKey("00000\\", "H")).toBeNull();
    expect(normalizeStrongKey("00000", "H")).toBeNull();
  });

  test("intro no-numérica → null (se descarta)", () => {
    expect(normalizeStrongKey("Dictionaries of Hebrew and Greek Words", "H")).toBeNull();
    expect(normalizeStrongKey("Dictionaries of Hebrew and Greek Words", "G")).toBeNull();
  });

  test("cada driver solo acepta su forma (G sin backslash, H con backslash)", () => {
    expect(normalizeStrongKey("00001\\", "G")).toBeNull();
    expect(normalizeStrongKey("00001", "H")).toBeNull();
  });

  test("basura → null", () => {
    expect(normalizeStrongKey("", "G")).toBeNull();
    expect(normalizeStrongKey("ABC", "G")).toBeNull();
    expect(normalizeStrongKey("AARON", "G")).toBeNull();
  });

  test("coherente con normStrong: la app buscará por ese estilo", () => {
    // normStrong("G03056") === "G3056" === normalizeStrongKey("03056", "G")
    for (const raw of ["00001", "03056", "05463", "5624"]) {
      expect(normalizeStrongKey(raw, "G")).toBe(normStrong(`G${raw}`));
    }
    expect(normalizeStrongKey("00001\\", "H")).toBe(normStrong("H00001"));
  });
});
