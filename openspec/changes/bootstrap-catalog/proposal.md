# Proposal: bootstrap-catalog — Formato .amod, ETL y catálogo oficial v1

## Why

Aletheia Platform necesita una fuente de contenido legalmente limpia y técnicamente
eficiente. El free library de Logos demuestra que el contenido dominio público basta para
un producto completo (su free tier de $199 es ~100% PD), y CrossWire ofrece esos mismos
recursos como módulos SWORD descargables. Falta un formato moderno, determinista y
verificable que empaquete ese contenido para móvil (SQLite+FTS5 nativo) con la licencia
declarada en cada módulo.

## What

- **AMF v1** (`.amod`): zip determinista = `manifest.json` (licencia/copyright/fuente
  obligatorios) + `content.db` (SQLite page_size 8192, FTS5 `unicode61 remove_diacritics 2`,
  external content, `application_id` propio, `user_version` = schemaVersion).
  Esquemas por tipo: bible (verses+sections+footnotes), commentary, dictionary/lexicon,
  devotion; crossref reservado.
- **ETL Bun nuevo** (conocimiento del formato SWORD obtenido de su fuente oficial
  zverse.cpp/versificationmgr.cpp, implementación propia):
  drivers zText4/zCom4 (vss 10B + zdx 12B + bloques zlib), RawText, rawld4;
  parser `.conf`; conversión OSIS→texto plano con extracción de headings y notas.
- **Lote v1 (9 módulos, espejo Logos free)**: ASV, KJV, WEB, JFB, Vincent, SME, APF,
  Creeds, Smith. Todo Public Domain. Lo que Logos no ofrece → integración futura
  (incluidas traducciones ES CC).
- **Catálogo**: `catalog/catalog.json` (id, type, language, license, sha256, sizeBytes,
  downloadUrl) generado por `build-catalog.ts` y distribuido vía GitHub Releases.
- **Política legal**: `docs/content-policy.md` (vetting, disclaimers, contacto, provenance).

## Non-Goals

- No reutilizar código de `aletheia-bridge`/`aletheia-modules` (solo aprendizaje).
- No runtime SWORD: el ETL convierte a .amod; la app nunca lee formatos SWORD.
- No catálogos de terceros ni importación de usuario en v1.
- No audio, imágenes, strongs inline ni módulos general-book en v1 (APF puede requerir
  driver genbook: si su complejidad lo impide, se publica en v1.1 y el lote arranca con 8).

## Impact

- Repo nuevo, sin dependencia del ecosistema existente.
- Consumidor: `aletheia-platform` (repo hermano, se bootstrappea después).
- Entregables verificables: doble build reproducible por módulo + textos esperados
  (Gen 1:1, Sal 119:105, Ap 22:21) en tests.
