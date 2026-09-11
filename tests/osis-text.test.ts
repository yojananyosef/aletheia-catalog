import { describe, test, expect } from "bun:test";
import { osisToText, tidyPunctuation } from "../scripts/lib/osis-text";

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

  test("tidyPunctuation limpia artefactos de strip sin tocar v1", () => {
    expect(tidyPunctuation("In the beginning , God created")).toBe("In the beginning, God created");
    expect(tidyPunctuation("“ Yes , I am coming soon . ”")).toBe("“Yes, I am coming soon.”");
    expect(tidyPunctuation("lamp to my feet , and a light")).toBe("lamp to my feet, and a light");
    // osisToText NO aplica tidy (shas v1.0.0 intactos)
    expect(osisToText("hola , mundo").text).toBe("hola , mundo");
  });

  test("aplana TEI de diccionarios (entryFree/def/orth) sin dejar marcado", () => {
    const hitch = osisToText(`<entryFree n="Aaron">\n<def>a teacher; lofty; mountain of strength</def>\n\n</entryFree>`);
    expect(hitch.text).toBe("a teacher; lofty; mountain of strength");
    const sg = osisToText(
      `<entryFree n="3056">\n<orth>λόγος</orth><lb/>\n<orth type="writing">lovgos</orth> <pron rend="italic">{log'-os}</pron>\n<def>\n\n from 3004; something said\n</def>\n\n</entryFree>`,
    );
    expect(sg.text).toContain("λόγος");
    expect(sg.text).toContain("something said");
    expect(sg.text).not.toContain("<");
    expect(sg.text).not.toContain("entryFree");
  });

  test("aplana ThML de TSK (scripRef) y refs TEI (osisRef/target) a su texto", () => {
    const tsk = osisToText(
      `<br /><scripRef passage="Ge 1:1">1</scripRef> God creates heaven and earth;<br /><scripRef>Job 26:7; Isa 45:18</scripRef>`,
    );
    expect(tsk.text).toContain("God creates heaven and earth");
    expect(tsk.text).toContain("Job 26:7");
    expect(tsk.text).not.toContain("scripRef");
    const nave = osisToText(`Lineage of <ref osisRef="Exod.6.16-Exod.6.20">Ex 6:16-20</ref>; <ref osisRef="Josh.21.4">Jos 21:4</ref>`);
    expect(nave.text).toContain("Ex 6:16-20");
    const isbe = osisToText(`<p>See <ref target="ISBE:ALEPH">ALEPH</ref>; <ref target="ISBE:ALPHABET">ALPHABET</ref>.</p>`);
    expect(isbe.text).toContain("ALEPH");
    expect(isbe.text).not.toContain("ISBE:");
  });
});
