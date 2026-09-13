# Proposal: closes-logos-mirror — Vincent + APF + Creeds (cierre del espejo Logos free)

## Why

El `proposal.md` de `bootstrap-catalog` definió el lote v1 como espejo estricto del
free library de Logos (9 módulos PD: ASV, KJV, WEB, JFB, Vincent, SME, APF, Creeds,
Smith). Hoy el catálogo publica 14 módulos pero los 3 diferidos originales siguen
fuera — el objetivo v1 está incompleto.

Investigación 2026-09-13: los 3 **no existen en CrossWire** (`ModInfo: No module
found` para `Vincent`, `APF`, `Creeds`; el mirror `rawzip/` con 463 zips no los
contiene). No es un problema de drivers SWORD: no hay fuente SWORD que importar.
El camino es el ETL manual desde fuentes PD ya previsto en `tasks.md` ("vía ETL
manual desde CCEL pendiente (mismo bucket que Creeds)").

## What

- **VINCENT** (`commentary`, NT): *Word Studies in the New Testament* (1887) de
  Marvin R. Vincent (1834–1922) → PD por antigüedad. Fuente:
  `sacred-texts.com/bib/cmt/vws/<lib><cap>.htm` (HTML estático por capítulo,
  artículo con secciones `John 1:1`…`John 1:N`). Se modela como `commentary`
  disperso (solo versículos con comentario, sin intros de libro).
- **APF** (`dictionary`, 274 entradas): *The Apostolic Fathers* de J. B. Lightfoot
  (1828–1889) → PD. Fuente: `ccel.org/ccel/l/lightfoot/fathers/cache/fathers.txt`
  (`Rights: Public Domain` en cabecera). 15 documentos (1–2 Clement, 7 Ignatius,
  Polycarp, Martyrdom, Didache, Barnabas, Hermas, Diognetus) partidos por sus
  marcadores (`1 Clem. 1`…`Diogn. 12`); claves = marcador fuente.
- **CREEDS** (`dictionary`, ~320 entradas): *Historic Creeds and Confessions*,
  ed. Rick Brannan → `Rights: Public Domain` en CCEL. Fuente:
  `ccel.org/ccel/b/brannan/hstcrcon/cache/hstcrcon.txt`. Credos (Apostles, Nicene,
  Athanasian) + Heidelberg (52 Lord's Days + 129 Questions) + Canons of Dordt +
  Belgic (37 Articles); cada sección `___` no-nota es una entrada con contexto
  de documento en la clave.
- **Sin cambios de esquema**: los 3 son `schemaVersion 1` (punto de coordinación
  v1.1: ningún módulo v2 hasta `READER_SCHEMA_VERSION 2` en aletheia-platform).
  Reutilizan tablas `entries(bookId,chapter,verse)` y `entries(key,sortKey,…)`
  existentes + `buildAmod` determinista (doble build + sha256).
- **Nuevo ETL**: `scripts/lib/ccel.ts` (parsers puros, testeables sin red) +
  `scripts/import-ccel.ts` (descarga → parse → `.amod`). `import-sword.ts` solo
  avisa y salta defs con `ccelKind`. `release.yml` construye los 17.

## Non-Goals

- No driver genbook/rawGenBook SWORD: APF no viene de SWORD; se archiva la idea.
- No intros de libro/capítulo como entradas propias (misma decisión que SWORD:
  intros fuera de v1; las intros Vincent `mat000.htm` se omiten).
- No Hermas sub-partido (Visions/Mandates/Similitudes quedan en 3 entradas
  grandes) ni reordenación alfabética de APF/Creeds (orden fuente = determinista).
- No módulos schema v2, no licencias no-PD (Robinson/SBLGNT/WHNU/WLC/ES siguen
  bloqueados pendientes del usuario).

## Impact

- `scripts/modules-v1.json`: VINCENT/APF/CREEDS dejan de ser `deferred`
  (versión `1.0.0`, fuente PD, checks). `catalog.json` pasa de 14 → **17 módulos**.
- Consumidor `aletheia-platform`: desbloquea biblioteca completa del perfil
  Lector/Predicador sin cambiar su `READER_SCHEMA_VERSION`.
- Entregables verificables: `bun run import:ccel --all` (doble build idéntico) +
  `tests/ccel.test.ts` sin red + shas en `PROVENANCE.md`.
