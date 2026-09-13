import { describe, expect, test } from "bun:test";
import {
  htmlToText, parseApf, parseCreeds, parseVincentChapter, txtToText, vincentFileName,
} from "../scripts/lib/ccel";

describe("htmlToText", () => {
  test("aplana tags, decodifica entidades y griego", () => {
    expect(htmlToText(`<p>In the <b>beginning</b> was &amp; &#x1F00; &#957;?</p>`)).toBe(
      "In the beginning was & ἀ ν?",
    );
  });
  test("elimina scripts y comentarios", () => {
    expect(htmlToText(`a<script>x()</script>b<!-- c -->d`)).toBe("a b d");
  });
});

describe("parseVincentChapter", () => {
  const html = `<html><body><article>
<h3>John Chapter 1</h3>
<p><a href="/bib/kjv/joh001.htm#001">John 1:1</a></p>
<p><span><a id="an_001">joh 1:1</a></span></p>
<p>In the beginning was (&#7952;&#957; &#7936;&#961;&#967;&#8135;)</p>
<p>With allusion to <a href="/bib/kjv/gen001.htm#001">Gen 1:1</a> and <a href="/bib/kjv/joh001.htm#003">Joh 1:3</a>.</p>
<p><a href="/bib/kjv/joh001.htm#002">John 1:2</a></p>
<p>The same was in the beginning.</p>
<p><a href="/bib/kjv/joh002.htm#001">John 2:1</a></p>
<p>Otro capítulo: se ignora.</p>
</article></body></html>`;
  test("secciona por versículo del mismo capítulo; refs inline no parten", () => {
    const vv = parseVincentChapter(html, "John", 1);
    expect(vv.map((v) => v.verse)).toEqual([1, 2]);
    expect(vv[0].text).toContain("In the beginning was");
    expect(vv[0].text).toContain("Gen 1:1");
    expect(vv[1].text).toContain("The same was");
  });
  test("libro distinto no mezcla", () => {
    expect(parseVincentChapter(html, "Mark", 1)).toEqual([]);
  });
});

describe("parseApf", () => {
  const txt = `     __________________________________________________________________

           Title: The Apostolic Fathers
      Creator(s): Lightfoot, Joseph Barber (1828-1889)
          Rights: Public Domain
     __________________________________________________________________

THE FIRST EPISTLE OF CLEMENT TO THE CORINTHIANS

1 Clem. Prologue

   The Church of God which sojourneth in Rome.

1 Clem. 1

   By reason of calamities.

     __________________________________________________________________

[1] Nota al pie del documento anterior.

     __________________________________________________________________

THE TEACHING OF THE TWELVE APOSTLES (also known as DIDACHE)

Did. 1

   There are two ways.

Did. 2

   Second precept.
`;
  test("274-partido por marcadores; omite cabecera y notas", () => {
    const entries = parseApf(txt);
    expect(entries.map((e) => e.key)).toEqual([
      "1 Clem. Prologue", "1 Clem. 1", "Did. 1", "Did. 2",
    ]);
    expect(entries[1].content).toContain("calamities");
  });
  test("sin Rights PD falla", () => {
    expect(() => parseApf("Title: X\nRights: CC BY-NC\n___\nDid. 1\ntext")).toThrow(/Public Domain/);
  });
});

describe("parseCreeds", () => {
  const txt = `     __________________________________________________________________

           Title: Historic Creeds and Confessions
          Rights: Public Domain
     __________________________________________________________________

                                Apostles' Creed

   I believe in God the Father.
     __________________________________________________________________

   [1] Philip Schaff, Creeds vol 1.
     __________________________________________________________________

                                  Nicene Creed

   I believe in one God.
     __________________________________________________________________

The Heidelberg Catechism

   Composed at request of Elector Frederick.
     __________________________________________________________________

Lord's Day 1
     __________________________________________________________________

Question 1

   What is thy only comfort? That I am not my own.
     __________________________________________________________________

The Canons of Dordt

   In 1610 the Remonstrance.
     __________________________________________________________________

First Head of Doctrine

   Divine Election and Reprobation
     __________________________________________________________________

Article 1

   As all men have sinned.
     __________________________________________________________________

Rejection of Errors

   The Synod rejects the errors of those:
     __________________________________________________________________

Paragraph 1

   Who teach error one.
     __________________________________________________________________

The Belgic Confession

   Composed in 1561 by Guido de Bres.
     __________________________________________________________________

Article I

   There Is Only One God. We believe.
`;
  test("claves con contexto; omite notas", () => {
    const entries = parseCreeds(txt);
    expect(entries.map((e) => e.key)).toEqual([
      "Apostles' Creed", "Nicene Creed", "Heidelberg Catechism",
      "Heidelberg Lord's Day 1", "Heidelberg Q1",
      "Canons of Dordt", "Canons I", "Canons I Art 1",
      "Canons I Rejection", "Canons I Rej Par 1",
      "Belgic Confession", "Belgic Art I",
    ]);
    expect(entries[4].content).toContain("only comfort");
  });
  test("colisiones se sufijan", () => {
    const dup = parseCreeds(`Title: T\nRights: Public Domain\n${"_".repeat(60)}\nCustom\nbody one\n${"_".repeat(60)}\nCustom\nbody two\n`);
    expect(dup.map((e) => e.key)).toEqual(["Custom", "Custom (2)"]);
  });
});

describe("vincentFileName", () => {
  test("slugs y padding", () => {
    expect(vincentFileName("John", 1)).toBe("joh001.htm");
    expect(vincentFileName("1Cor", 13)).toBe("co1013.htm");
    expect(vincentFileName("Jude", 1)).toBe("jde001.htm");
    expect(vincentFileName("Rev", 22)).toBe("rev022.htm");
    expect(() => vincentFileName("Gen", 1)).toThrow(/sin slug/);
  });
});

describe("txtToText", () => {
  test("colapsa espacios", () => {
    expect(txtToText("  a   b\n\nc  ")).toBe("a b c");
  });
});
