import { describe, test, expect } from "bun:test";
import { osisToText } from "../scripts/lib/osis-text";

describe("osisToText", () => {
  test("extrae texto plano y headings", () => {
    const r = osisToText(`<title>Creation</title>In the beginning <transChange>God</transChange> created`);
    expect(r.text).toBe("In the beginning God created");
    expect(r.headings).toEqual(["Creation"]);
  });

  test("extrae notas al pie con caller", () => {
    const r = osisToText(`lamp unto my feet<note n="a">Heb. lamp</note> and light`);
    expect(r.text).toContain("lamp unto my feet");
    expect(r.text).toContain("and light");
    expect(r.footnotes).toEqual([{ caller: "a", text: "Heb. lamp" }]);
  });

  test("decodifica entidades soportadas y colapsa espacios", () => {
    // Contrato v1: 6 nombradas (amp/lt/gt/quot/apos/nbsp) + numéricas.
    // Entidades nombradas extendidas (&uacute;…) quedan para ETL v1.1
    // (cambiarlo alteraría los bytes/sha256 de los .amod v1.0.0 publicados).
    const r = osisToText(`Jes&#250;s &amp;  Jes&#xFA;s&nbsp; bien`);
    expect(r.text).toBe("Jesús & Jesús bien");
  });

  test("nota autocerrada no rompe el texto", () => {
    const r = osisToText(`hola<note n="x"/> mundo`);
    expect(r.text).toBe("hola mundo");
    expect(r.footnotes).toEqual([]);
  });
});
