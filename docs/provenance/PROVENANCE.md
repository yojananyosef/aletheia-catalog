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

## Diferidos (v1.1) — sin publicación hasta resolver

| id | Motivo |
|----|--------|
| WEB | módulo fuente (ebible.org) usa versificación extendida (39.275 slots, con apócrifos) |
| JFB | versificación excede KJV66 (28.938+9.895 slots) — multi-versificación requerida |
| Vincent | ídem |
| APF | driver genbook (rawGenBook) pendiente |
| Creeds | ETL manual desde CCEL pendiente |
