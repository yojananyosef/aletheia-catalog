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
- **`docs/content-policy.md`** — política de contenido: solo dominio público o licencias
  verificadas; modelo de disclaimer y contacto (estilo CrossWire).

## Lote v1 — espejo del free library de Logos

ASV · KJV · WEB (sustituto PD de CSB/ESV) · JFB · Vincent · SME (Spurgeon) · APF · Creeds · Smith.
Todo dominio público, fuentes CrossWire (o CCEL para credos). El resto (Strong, TSK,
traducciones ES CC, originales, WLC/SBLGNT…) va a integraciones futuras.

## Uso

```sh
bun install
bun run import --module ASV     # descarga de CrossWire → dist/ASV.amod
bun run catalog                 # regenera catalog/catalog.json con sha256
bun test                        # verificación: doble build reproducible + textos esperados
```
