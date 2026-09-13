import { describe, test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { sha256Hex } from "../scripts/lib/amf";

const catalog = (await Bun.file(new URL("../catalog/catalog.json", import.meta.url)).json()) as any;
const distDir = new URL("../dist/", import.meta.url).pathname;

// Contrato del canal de distribución: git+raw pineado a tag inmutable.
// github.com/.../releases/... no envía Access-Control-Allow-Origin y rompe
// la descarga en web (solo Android nativo la tolera). Este test impide
// reintroducir ese host o una base mutable (/main/) que rompería apps viejas.
describe("canal de distribución (CORS/releaseBase)", () => {
  test("releaseBase es raw pineado a tag, nunca releases ni main", () => {
    expect(catalog.releaseBase).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/yojananyosef\/aletheia-catalog\/v\d+\.\d+\.\d+\/dist$/,
    );
    expect(catalog.releaseBase).not.toContain("github.com");
    expect(catalog.releaseBase).not.toContain("/main/");
  });

  test("todo downloadUrl cuelga de releaseBase", () => {
    expect(catalog.modules.length).toBeGreaterThan(0);
    for (const m of catalog.modules) {
      expect(m.downloadUrl).toBe(`${catalog.releaseBase}/${m.id}.amod`);
    }
  });

  test("dist/*.amod commiteados coinciden con el catálogo (sha256 + size)", async () => {
    for (const m of catalog.modules) {
      const path = `${distDir}${m.id}.amod`;
      expect(existsSync(path)).toBe(true);
      const u8 = new Uint8Array(await Bun.file(path).arrayBuffer());
      expect(u8.length).toBe(m.sizeBytes);
      expect(sha256Hex(u8)).toBe(m.sha256);
    }
  });
});
