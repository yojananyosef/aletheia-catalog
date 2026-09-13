# aletheia-catalog

Catálogo oficial de módulos bíblicos **`.amod`** (Aletheia Module Format v1) para
[Aletheia Platform](https://github.com/yojananyosef/aletheia-platform).

## Qué es esto

- **`format/AMF-SPEC.md`** — especificación del formato `.amod`: un zip con `manifest.json`
  (licencia, copyright, fuente) + `content.db` (SQLite con FTS5 sin diacríticos).
  Bundle determinista: builds reproducibles con sha256 estable.
- **`catalog/catalog.json`** — índice máquina de los módulos publicados (id, tipo, idioma,
  licencia, sha256, URL de descarga). Es lo único que la app consume.
- **`scripts/`** — ETL en Bun: lee módulos SWORD de [CrossWire](https://www.crosswire.org)
  (zText4/zCom4/RawText/rawld4) y fuentes PD/CC, y produce `.amod` con texto plano limpio.
  Vincent/APF/Creeds (sin fuente SWORD) vienen de ETL manual: sacred-texts + CCEL
  (`bun run import:ccel`).
- **`docs/content-policy.md`** — política de contenido: solo dominio público o licencias
  verificadas; modelo de disclaimer y contacto (estilo CrossWire).

## Lote v1 — espejo del free library de Logos

ASV · KJV · WEB (sustituto PD de CSB/ESV) · JFB · Vincent · SME (Spurgeon) · APF · Creeds · Smith.
Todo dominio público, fuentes CrossWire (o CCEL para credos). El resto (Strong, TSK,
traducciones ES CC, originales, WLC/SBLGNT…) va a integraciones futuras.

## Uso

```sh
bun install
bun run import --module=ASV    # descarga de CrossWire → dist/ASV.amod
bun run import --module ASV    # forma alternativa (espacio en vez de =)
bun run import --all           # todos los módulos SWORD no diferidos (equivale al default)
bun run import:ccel --all      # Vincent + APF + Creeds (ETL manual sacred-texts/CCEL)
bun run catalog                # regenera catalog/catalog.json con sha256
bun test                       # verificación: doble build reproducible + textos esperados
bun run typecheck              # tsc --noEmit (tipos estrictos)
```

Requiere [Bun](https://bun.sh) ≥ 1.2 (`bun --version`). Los builds son
deterministas: dos ejecuciones del mismo contenido producen el mismo sha256
(ver `format/AMF-SPEC.md §1`). `catalog/catalog.json` publicado corresponde al
release `v1.0.0` (assets `ASV/KJV/SME/SMITH.amod` verificados por sha256).

## Distribución (canal oficial)

- Fuente de verdad: `dist/*.amod` **commiteados en git** + `catalog/catalog.json`.
- `releaseBase` pineado a tag inmutable con CORS `*`:
  `https://raw.githubusercontent.com/yojananyosef/aletheia-catalog/vX.Y.Z/dist`.
- Prohibido `github.com/.../releases/latest/download` como base: no envía
  `Access-Control-Allow-Origin` y el navegador bloquea la descarga en web
  (en Android nativo no afecta). Lo impone `tests/catalog-dist.test.ts` + CI.
- Publicar nueva versión: importar/reconstruir → `bun run catalog` →
  commit de `dist/` + `catalog.json` → push → `git tag vX.Y.Z` → push del tag.
  El `sha256` valida el cambio de host: la app consumidora no requiere cambios.
- Puntero flotante `catalog/latest.json` (`amf-latest-pointer` → tag + catalogUrl):
  el workflow `release` lo actualiza solo en `main` tras cada tag. Las apps lo
  leen para ver siempre la última versión con fallback a su pin si falla;
  las versiones por tag siguen inmutables.
