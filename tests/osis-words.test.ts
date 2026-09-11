import { describe, test, expect } from "bun:test";
import { osisToWords, osisToText, normStrong } from "../scripts/lib/osis-text";

describe("osisToWords (AMF v1.1)", () => {
  test("extrae strongs estilo WLC y conserva el texto v1", () => {
    const raw = `<w lemma="strong:H07225" morph="Ncfsa">FOO</w> bar <w lemma="strong:H0430">BAZ</w>`;
    const { text, words } = osisToWords(raw);
    expect(text).toBe(osisToText(raw).text);
    expect(words).toEqual([
      { position: 1, surface: "FOO", strongs: "H7225", lemma: null, morph: "Ncfsa" },
      { position: 2, surface: "BAZ", strongs: "H430", lemma: null, morph: null },
    ]);
  });

  test("separa lema griego de morph estilo SBLGNT", () => {
    const raw = `<w lemma="G3056 λόγος" morph="V-PAI-3S">surface</w>`;
    const { words } = osisToWords(raw);
    expect(words).toEqual([
      { position: 1, surface: "surface", strongs: "G3056", lemma: "λόγος", morph: "V-PAI-3S" },
    ]);
  });

  test("sin <w> devuelve cero palabras y mismo texto", () => {
    const raw = `In the beginning <transChange>God</transChange> created`;
    const { text, words } = osisToWords(raw);
    expect(words).toEqual([]);
    expect(text).toBe(osisToText(raw).text);
  });

  test("normStrong normaliza variantes", () => {
    expect(normStrong("strong:H07225")).toBe("H7225");
    expect(normStrong("H7225")).toBe("H7225");
    expect(normStrong("g3056")).toBe("G3056");
    expect(normStrong("λόγος")).toBeNull();
    expect(normStrong("")).toBeNull();
  });
});
