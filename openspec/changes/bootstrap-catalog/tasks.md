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
      + FIX 2026-09-11: la rama zLD parseaba el bloque inflado como texto
        (`inflated.toString(enc).split("\n")` indexado por entryIdx) → 364
        entradas basura de 3-4 caracteres + 2 mega-entradas de 600-700KB.
        El formato real es binario: u32LE `count` + `count`×(u32LE offset,
        u32LE size) + datos, offsets relativos al inicio del bloque
        (bloque 0: count=200, entrada 0 → offset 1604 = 4+200*8, size 4370;
        bloque 1: count=166). Nuevo `parseZldBlock()` en
        `scripts/lib/sword-module.ts` + test sin red `tests/zld.test.ts`.
        Re-importado: 366 devocionales, 01.01 contiene "They did eat of the
        fruit", 0 entradas con caracteres de control, longitudes 3520–5948B.
        Subido a **1.0.1** en `scripts/modules-v1.json` (v1.0.0 era basura).
- [x] Construir Smith (RawLD): 4.639 entradas deduplicadas; determinista
- [x] No-regresión 2026-09-11: los 4 reconstruyen **byte-idénticos** a v1.0.0 tras todos los cambios v1.1 (shas verificados contra catalog.json)
- [x] No-regresión fix zLD 2026-09-11: ASV/JFB/KJV/SMITH/WEB reconstruidos **byte-idénticos** (shas = catalog.json); solo SME cambia (→ 1.0.1, sha `cfbe6b9e…`)
- [x] JFB (zCom4 12B): 24.586 entradas; checks ✓; determinista — verificado local, pendiente release v1.1.0
- [x] WEB (engweb2025peb, KJV66): 31.095 vss, 165 headings, 1.568 notas; 5 checks ✓; determinista — verificado local, pendiente release v1.1.0
- [ ] Vincent: sin fuente SWORD (ModInfo: No module found) — ETL manual CCEL con Creeds
- [ ] APF (genbook), Creeds (ETL CCEL): v1.1 tardía

## AMF v1.1 — formato words (Fase 1, implementado, sin publicar módulos v2)

- [x] Decisión: **tabla `words`** (no columna): `(bookId, chapter, verse, position, surface, strongs, lemma, morph)` + índices parciales strongs/lemma — spec §3.7
- [x] `osisToWords()`: parse `<w lemma morph>` estilo WLC/SBLGNT/WHNU, normaliza `strong:H07225` → `H7225`; `text` idéntico a `osisToText` (byte-compat v1); validado con Gén 1 real de WEB (667/667 con strongs)
- [x] Builder: `schemaVersion 1|2`, `minReaderVersion === schemaVersion`, tabla creada solo si schema ≥ 2 (v1 byte-idéntico probado), validación de filas, inserts ordenados
- [x] Tests: `words.test.ts` + `osis-words.test.ts` (30→33 pass)
- [ ] Publicar primer módulo schemaVersion 2 (Oleada 3) SOLO tras `READER_SCHEMA_VERSION 1→2` en aletheia-platform (su installer rechaza `user_version` 2 hoy)

## Oleada 1 — hallazgos de versificación (2026-09-11)

- JFB no era "versificación extendida": zCom usa índice de 12B (size u32). `ZTextReader(entrySize)` + `ModDrv → 12|10`. Resuelto.
- WEB: el zip CrossWire/ebible `engweb2025eb` es NRSVA con apócrifos (NT descuadrado: Rev 22:21 leía 22:18). Fuente correcta: `engweb2025peb` (protestante, KJV, conteos exactos) + `slotShift.nt=1` (quirk del exportador, verificado en plano) + `textTidy` opt-in (osisToText intacto para v1).
- `mergeSections`: varios `<title>` por versículo se unen con " — " (PK intacta, sin cambio de DDL).

## Distribución

- [x] `.github/workflows/ci.yml`: push/PR → install + typecheck + tests
- [x] `.github/workflows/release.yml`: tag v* → typecheck + tests + builds
      (ASV/KJV/SME/SMITH) + verificación sha256 contra catalog.json + assets
- [x] `docs/content-policy.md` + `docs/provenance/PROVENANCE.md` con evidencia por módulo
- [x] Publicar repo + release `v1.0.0` con los 4 módulos v1 (shas verificados)

## Mantenimiento v1.0.x (sin romper shas publicados)

- [x] `tsc --noEmit` en verde + `bun run verify` (typecheck + tests)
- [x] Tests sin red: osis-text, conf parser, zip determinista, validateManifest
- [ ] NO tocar en v1.0.x (cambian bytes/sha256 → reservado a AMF v1.1):
      triggers FTS DELETE/UPDATE, FTS en devotion/keys, entidades nombradas
      extendidas en osis-text, esquema SQLite/zip

## Lote v1.1 — habilita las fases F10-F12 de aletheia-platform

Coordina con `aletheia-platform` (specs study/workspace): sin este lote, guías/factbook/
idiomas originales quedan bloqueados. Fuentes CrossWire (drivers ya implementados en ETL
o conocidos):

### Lote PD v1.1 (importado 2026-09-11, verificado local, pendiente release v1.1.0)

Todo `schemaVersion 1` (punto de coordinación), `verify` verde, doble build
determinista, 6 .amod previos byte-idénticos (shas = catalog.json).

- [x] HITCHCOCK (dictionary, zLD TEI): 2616 → **2612** entradas (4 dups); checks AARON/ABADDON/JESUS/ZUZIMS; 184KB, sha `bb4283b4…`
- [x] EASTON (dictionary, zLD TEI): 3963 → **3961** (2 dups); checks A/AARON/ABADDON/JESUS; 2.24MB, sha `db3d446a…`
- [x] NAVE (dictionary, zLD TEI, backbone Factbook F11): 5322 → **5320** (2 dups); checks AARON/ABADDON/ZUZIMS; 1.41MB, sha `02f3145f…`
- [x] STRONGSGREEK (lexicon, zLD TEI, `normalizeKeys: "G"` → `G<num>` estilo
      `normStrong`, strongs poblado 5741/5741; cabecera "00000" descartada;
      252 `@@@@` conservados como en fuente): 5742 → **5741**; checks
      G1/G3056/G5463; 980KB, sha `066d72b6…`
- [x] STRONGSHEBREW (lexicon, RawLD, `"NNNNN\"→"H<num>"`, strongs 8674/8674;
      intro descartada): 8675 → **8674**; checks H1/H3056/H8674; 1.19MB, sha `4813a4cb…`
- [x] ABBOTTSMITH (lexicon, zLD TEI, lemas griegos, strongs null; 10 dups +
      20 colisiones sortKey aceptables): 5896 → **5886**; checks
      Α/ΛΌΓΟΣ/ΘΕΌΣ/ΧΡΙΣΤΌΣ; 1.67MB, sha `ed4e228b…`
- [x] ISBE (dictionary, zLD TEI 10MB, refs internos aplanados): 9380 → **9349**
      (31 vacías omitidas); checks A/AARON/ABADDON/JESUS; 16.97MB, sha `488ad53d…`
- [x] TSK (commentary, zCom clásico **10B**: `resolveVssEntrySize()` zCom→10 /
      zCom4→12 + fallback vs canon, test `tests/zcom.test.ts`; JFB intacto en
      12B; `slotShift.nt=1` como WEB; REV 22:21 vacío en fuente): **31089**
      entradas; checks GEN 1:1→"Joh 1:1", MAT 1:1→"genealogy",
      JHN 1:1→"Ge 1:1", REV 22:20→"Amen"; 5.31MB, sha `023ad626…`
- [x] `osisToText` SIN cambios (aplana TEI/ThML limpio: verificado
      entryFree/def/orth/scripRef/osisRef/target + tests en
      `tests/osis-text.test.ts`; artefactos menores " ;"/" ," como en fuente,
      sin tidy para no tocar shas v1)
- [x] Tests nuevos sin red: `tests/zcom.test.ts` (stride 10/12 + fallback),
      `tests/strongs.test.ts` ("00001"→G1, "00001\"→H1, "00000"→null),
      casos TEI/ThML en `tests/osis-text.test.ts` (53 pass)
- [x] `catalog/catalog.json` regenerado (14 módulos) + `PROVENANCE.md` con
      entrada por módulo (fuente, licencia PD, conteos, sha)

### Excluidos del lote (bloqueo licencia/política, sin tocar)

- [x] TSK, Nave, Easton, ISBE, Hitchcock, StrongsGreek, StrongsHebrew, Abbott-Smith: hechos arriba (eran zLD/RawLD/zCom, no rawld4)
- [ ] Robinson (morfología griega — rawld4 con claves strongs): EXCLUIDO lote (CC BY-SA 4.0, pendiente usuario)
- [ ] SBLGNT ("Free non-commercial"), WHNU (CC BY-NC-SA): EXCLUIDOS lote (pendiente usuario)
- [ ] WLC: EXCLUIDO lote (requiere mapa de versificación Leningrad + sin `<w>`, pendiente usuario)
- [ ] Módulo armonía de pasajes paralelos (fuente PD a definir)
- [ ] Decisión de formato: cómo almacenar strongs por palabra (columna strongs por versículo
      vs tabla words) — spec AMF v1.1 antes de construir

