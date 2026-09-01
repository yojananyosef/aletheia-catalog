# Tasks: bootstrap-catalog

## Formato y spec

- [x] `format/AMF-SPEC.md` v1 completo (contenedor, manifest, esquemas por tipo, versificación)
- [x] Documentar decisión: intros de SWORD fuera de v1; texto plano sin marcado

## ETL núcleo

- [x] `scripts/lib/canon.ts`: tablas de 66 libros (canon.h) + índice plano tipo VerseKey
      (module/testament/book/chapter headings + versículos) — 31.102 vss, 1.189 capítulos
- [x] `scripts/lib/sword/conf.ts`: parser de .conf SWORD (comentarios `#`, claves multilínea)
- [x] `scripts/lib/sword/ztext4.ts`: lector vss(10B)/zdx(12B)/bzz(zlib) — válido para zText/zCom/zText4/zCom4
- [x] `scripts/lib/sword/rawtext.ts`: lector RawText (bks/cps + separación \n) — sin módulo real en lote v1
- [x] `scripts/lib/sword/rawld4.ts`: lector rawld4 (.dat/.idx) para diccionarios
- [x] `scripts/lib/sword-module.ts`: lector zLD adicional (.dat/.idx/.zdx/.zdt) para devotionals comprimidos
- [x] `scripts/lib/osis-text.ts`: OSIS/markup → texto plano + headings + notas + entidades
- [x] `scripts/lib/amf.ts`: builder SQLite (pragmas, FTS5 external content, triggers) + zip determinista propio (scripts/lib/zip.ts: crc32 + headers con DOS epoch fijo) + sha256
- [x] Tests unitarios: canon (totales), conf parser (implícito vía import), determinismo de zip, fixture zText4 sintético

## Importadores

- [x] `scripts/import-sword.ts`: descarga CrossWire/ebible → descomprime → detecta driver → .amod
- [x] `scripts/modules-v1.json`: definición de los 9 módulos v1 (fuente, licencia, checks)
- [x] `scripts/build-catalog.ts`: escanea dist/ → catalog/catalog.json con sha256 reales
- [x] Fixture sintético de zText4 para tests sin red

## Verificación real

- [x] Construir ASV desde CrossWire: Gen 1:1 / Sal 119:105 / Ap 22:21 correctos; 30.826 vss; doble build sha256 idéntico
- [x] Construir KJV: 30.842 vss, 394 headings, 6.959 notas; checks ✓; determinista
- [x] Construir SME (zLD): 366 devocionales; determinista
- [x] Construir Smith (RawLD): 4.639 entradas deduplicadas; determinista
- [ ] WEB, JFB, Vincent: requieren soporte multi-versificación (canon extendido del fuente) — v1.1
- [ ] APF (genbook), Creeds (ETL CCEL): v1.1

## Distribución

- [x] `.github/workflows/release.yml`: tag v* → tests + builds + verificación de determinismo + release
- [x] `docs/content-policy.md` + `docs/provenance/PROVENANCE.md` con evidencia por módulo
- [ ] Publicar repo + primera release taggeada con los 4 módulos v1
