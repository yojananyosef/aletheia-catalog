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

## SME.amod
- **Fuente**: CrossWire SWORD module `SME` (https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=SME)
- **Licencia declarada por CrossWire**: Public Domain (1869, C. H. Spurgeon)
- **ETL**: driver zLD (.dat claves + .idx + .zdx/.zdt bloques zlib), 366 entradas diarias

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
