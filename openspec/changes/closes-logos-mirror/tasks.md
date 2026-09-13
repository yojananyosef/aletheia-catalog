# Tasks: closes-logos-mirror — COMPLETADO 2026-09-13 (17/17 en catálogo)

## Spec y diseño

- [x] `openspec/changes/closes-logos-mirror/proposal.md` (fuentes PD, no-SWORD, sin cambio de esquema)
- [x] `specs/module-format/spec.md` (deltas: ETL manual + modelo commentary/dictionary v1)
- [x] Shas finales: VINCENT `bd96357c…`, APF `470a7efd…`, CREEDS `8c0f63a7…` (ver `PROVENANCE.md`)

## ETL (`scripts/lib/ccel.ts`, puro, sin red)

- [x] `htmlToText()`: strip tags + entidades + colapso de espacios (preserva griego UTF-8)
- [x] `parseVincentChapter(html, bookLabel, chapter)`: secciones `<p><a>Book C:V</a></p>`
      del mismo capítulo → `(verse, text)`; refs cruzadas inline no parten secciones
- [x] `VINCENT_FILES`: mapa OSIS→slug sacred-texts + capítulos del canon; Filemón sin
      cobertura en la fuente (259/260 capítulos) se omite, documentado
- [x] `parseApf(txt)`: verifica `Rights: Public Domain`; parte por `___`; divide cada
      documento por marcadores; **274** entradas exactas (tripwire en import-ccel)
- [x] `parseCreeds(txt)`: verifica `Rights: Public Domain`; parte por `___`; omite
      notas `[...]`, índices y pie CCEL; clave con contexto; **330** entradas (tripwire)
- [x] `scripts/import-ccel.ts`: `--module=VINCENT|APF|CREEDS`, `--all`; reintentos;
      doble build + checks; `dist/<ID>.amod`
- [x] `import-sword.ts`: salta defs con `ccelKind` con aviso (no intenta descarga SWORD)

## Definiciones y distribución

- [x] `modules-v1.json`: VINCENT/APF/CREEDS sin `deferred`, `version 1.0.0`, `source`
      PD, `checks` (JHN 1:1 / claves)
- [x] `release.yml`: añade VINCENT/APF/CREEDS al build + verificación sha + assets
- [x] `package.json`: script `import:ccel`
- [x] `docs/provenance/PROVENANCE.md` + `docs/content-policy.md`: evidencia y tabla final
- [x] `catalog/catalog.json`: regenerado con 17 módulos

## Verificación

- [x] `tests/ccel.test.ts` sin red: fixtures Vincent/APF/Creeds + entidades + dedup (63 pass)
- [x] `bun run typecheck` + `bun test` verdes
- [x] `bun run import:ccel --all`: 3 builds deterministas; **rebuild desde cero reproduce
      los 3 shas byte-idénticos** (fuentes estables entre runs)
- [x] No-regresión: HITCHCOCK reconstruido byte-idéntico (`bb4283b4…` = catalog.json);
      resto de `dist/` intacto, shas de los 14 previos inalterados en el catálogo
