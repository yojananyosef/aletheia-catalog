# Provenance de módulos v1

Evidencia de licencia y fuente por módulo publicado. Regla: sin evidencia, sin publicación.

## ASV.amod
- **Fuente**: CrossWire SWORD module `ASV` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=ASV)
- **Licencia declarada por CrossWire**: Public Domain (1901)
- **ETL**: zText driver (.bzv/.bzs/.bzz), canon KJV 66 libros verificado (vss slots cuadrados con canon)

## KJV.amod
- **Fuente**: CrossWire SWORD module `KJV` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=KJV)
- **Licencia declarada por CrossWire**: Public Domain (1769)
- **Notas**: incluye ~6.959 notas al pie del fuente; texto plano sin marcado Strong (v1)

## SME.amod (v1.0.1 — fix de datos, v1.0.0 era basura y no debe publicarse)
- **Fuente**: CrossWire SWORD module `SME` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=SME)
- **Licencia declarada por CrossWire**: Public Domain (1869, C. H. Spurgeon)
- **ETL**: driver zLD (.dat claves + .idx + .zdx/.zdt bloques zlib), 366 entradas diarias
- **Fix 2026-09-11**: el bloque zLD inflado es binario (u32LE `count` + directorio
  offset/size + datos), no texto por líneas — `parseZldBlock()` en `scripts/lib/sword-module.ts`
  (verificado: bloque 0 count=200, bloque 1 count=166). Contenido verificado: 366
  devocionales, 01.01 contiene "They did eat of the fruit", 0 entradas con caracteres
  de control, longitudes 3520–5948B; los otros 5 .amod reconstruyen byte-idénticos.
- **sha256 v1.0.1**: `cfbe6b9e08b29b653b1f98c2237fa3d5bb3c84d01a897efbab6fcc7ccc314c9f`

## SMITH.amod
- **Fuente**: CrossWire SWORD module `Smith` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=Smith)
- **Licencia declarada por CrossWire**: Public Domain (1884, Dr. William Smith)
- **ETL**: driver RawLD (.dat/.idx), 4.639 entradas deduplicadas

## JFB.amod (v1.1, verificado local 2026-09-11, pendiente release v1.1.0)
- **Fuente**: CrossWire SWORD module `JFB` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=JFB)
- **Licencia declarada por CrossWire**: Public Domain (1871)
- **ETL**: driver zCom4 con índice de **12B por entrada** (size u32; ot.vss/12=24115 y nt.vss/12=8246 exactos, canon KJV66) — 24.586 entradas, determinista
- **sha256 local**: `81a56fb3b73d8314f730e8ed90abce8b8bcf227ea147e42ce61507c845e2a1a0`

## WEB.amod (v1.1, verificado local 2026-09-11, pendiente release v1.1.0)
- **Fuente**: ebible.org SWORD `engweb2025peb` (edición protestante, 66 libros, `Versification=KJV`, conteos exactos 24115/8246) — https://ebible.org/sword/zip/engweb2025peb.zip
- **Licencia**: Public Domain (página de detalles ebible: "public domain")
- **ETL**: zText 10B + `slotShift.nt=1` (el exportador escribe cada versículo NT un slot tarde: file(n)=canon(n-1), verificado en plano completo — "with you always" en 1101=1100+1, gracia/santos en el último slot; OT alineado) + `textTidy` (artefactos "palabra ," → "palabra,")
- **Contenido verificado**: 31.095 vss, 165 headings, 1.568 notas; GEN 1:1 / PSA 119:105 / MAT 1:1 / JHN 1:1 / REV 22:21 correctos; determinista
- **sha256 local**: `eb9e256898532f1426fd549805e23d8e1f3dc26e399db96151b205eef4f682bf`
- **Nota**: la fuente trae `<w lemma="strong:H…">` (667/667 palabras en Gén 1); en schemaVersion 1 se publica solo texto plano. La reconstrucción como schemaVersion 2 con tabla `words` queda para Oleada 3 (requiere READER_SCHEMA_VERSION 2 en la app)

## Diferidos (v1.1) — sin publicación hasta resolver

| id | Motivo |
|----|--------|
| Vincent | módulo SWORD inexistente en el repo principal de CrossWire (ModInfo: "No module found", 2026-09-11) — vía ETL manual desde CCEL pendiente |
| APF | driver genbook (rawGenBook) pendiente |
| Creeds | ETL manual desde CCEL pendiente |

## Lote v1.1 PD (verificado local 2026-09-11, pendiente release v1.1.0) — F10-F12 de aletheia-platform

Todos con `schemaVersion 1` (punto de coordinación: sin módulos schemaVersion 2),
doble build sha256 idéntico, `osisToText` sin cambios (los 6 .amod previos
reconstruyen byte-idénticos).

- **HITCHCOCK.amod** — CrossWire `Hitchcock` (zLD UTF-8, TEI `<entryFree><def>`),
  Public Domain (1869). 2.616 entradas fuente → **2.612** finales (4 dups
  case-insensitive). Checks: AARON/ABADDON/JESUS/ZUZIMS.
  sha256 `bb4283b432d1ff2c64f0da1440b28d52d6fe1cbc8d632399a10f668fec3d7d02`
- **EASTON.amod** — CrossWire `Easton` (zLD UTF-8, TEI), Public Domain (1897).
  3.963 → **3.961** finales (2 dups). Checks: A/AARON/ABADDON/JESUS.
  sha256 `db3d446afd970b1b0246cd3e7e55f5c53cf1cfebb3276ba27736d668e31a8011`
- **NAVE.amod** — CrossWire `Nave` (zLD UTF-8, TEI, tópicos con
  `<ref osisRef>` = backbone del Factbook F11), Public Domain (1896).
  5.322 → **5.320** finales (2 dups). Checks: AARON/ABADDON/ZUZIMS.
  sha256 `02f3145f4a51906d7e758cf70a5c7cec502102cd24e773be0a041cac9237029a`
- **STRONGSGREEK.amod** — CrossWire `StrongsGreek` (zLD UTF-8, TEI), Public
  Domain (1890). Tipo `lexicon` con strongs. Claves normalizadas a estilo
  `normStrong`: `"00001"→"G1"`, `"03056"→"G3056"`, `"00031A"→"G31a"`
  (`normalizeStrongKey()` en `scripts/lib/sword-module.ts`, `normalizeKeys: "G"`).
  Cabecera `"00000"` (prefacio) descartada. Las 252 entradas `@@@@NNNN`
  (números griegos sin glosa, continuidad numérica) **se conservan** como en la
  fuente. 5.742 → **5.741** finales, todas con strongs. Checks: G1/G3056/G5463.
  sha256 `066d72b63911153356fc117c91b75113d636c4f9b28171481a4c689e9be40fbe`
- **STRONGSHEBREW.amod** — CrossWire `StrongsHebrew` (RawLD vía RawLd4Reader),
  Public Domain (1890). Tipo `lexicon` con strongs. Claves `"NNNNN\"` con
  backslash → `"00001\"→"H1"` (`normalizeKeys: "H"`). Entrada intro
  ("Dictionaries of Hebrew and Greek Words") descartada. 8.675 → **8.674**
  finales, todas con strongs. Checks: H1/H3056/H8674.
  sha256 `4813a4cbb0fe7571ed9b098df7be5c98e988444b6ed6f83c4ba3bd151f54e7b1`
- **ABBOTTSMITH.amod** — CrossWire `AbbottSmith` (zLD UTF-8, TEI, lemas
  griegos), Public Domain (1922). Tipo `lexicon`, strongs null (claves por
  lema). Orden no alfabético; 10 dups case-insensitive y 20 colisiones de
  sortKey (UNIQUE(sortKey,key) solo falla con duplicado exacto: aceptable).
  5.896 → **5.886** finales. Checks: Α/ΛΌΓΟΣ/ΘΕΌΣ/ΧΡΙΣΤΌΣ.
  sha256 `ed4e228bd5806cabd917a03d6a765b7688809612f82e042f598947bef70a8e61`
- **ISBE.amod** — CrossWire `ISBE` (zLD UTF-8, TEI, 10MB, `<ref target="ISBE:…">`
  internos aplanados a texto), Public Domain (1915). 9.380 → **9.349** finales
  (31 entradas vacías `<p></p>` omitidas). Checks: A/AARON/ABADDON/JESUS.
  sha256 `488ad53d62d26cdf86f35273e6666f0e776feedababeb166c6f4115583229fad`
- **TSK.amod** — CrossWire `TSK` (zCom clásico **10B**, ThML `<scripRef>`,
  ot.bzv=241150=24115×10, nt.bzv=82460=8246×10), Public Domain (c. 1880).
  Modelado como `commentary` (versículo→xrefs aplanados; la app F10 lo consume
  como comentario; sin cambio de DDL). ETL: `resolveVssEntrySize()`
  (zCom→10, zCom4→12, fallback vs canon) + `slotShift.nt=1` (mismo quirk del
  exportador que WEB: file(n)=canon(n-1) en NT; REV 22:21 queda vacío en la
  fuente y se omite). **31.089** entradas. Checks: GEN 1:1→"Joh 1:1",
  MAT 1:1→"genealogy", JHN 1:1→"Ge 1:1", REV 22:20→"Amen".
  sha256 `023ad626356d5d47d76d92268a2f04f7c413236e984fd4353eb40a6326a68a3b`

Excluidos de este lote (bloqueo de licencia/política, sin tocar):
Robinson (CC BY-SA 4.0), SBLGNT (free non-commercial), WHNU (CC BY-NC-SA),
WLC (requiere mapa de versificación Leningrad + sin `<w>`).
