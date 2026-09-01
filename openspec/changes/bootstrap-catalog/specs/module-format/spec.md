## ADDED Requirements

### Requirement: Formato .amod determinista y verificable

El sistema SHALL empaquetar cada módulo como un zip `.amod` con `manifest.json` +
`content.db` (SQLite), con sha256 reproducible entre builds idénticos, y el manifiesto
deberá declarar licencia, copyright, fuente y atribución obligatorios.

#### Scenario: Doble build reproducible
- **WHEN** se construye el mismo módulo dos veces desde la misma fuente
- **THEN** ambos `.amod` tienen sha256 idéntico

#### Scenario: Detección de formato
- **WHEN** un lector abre `content.db`
- **THEN** el `application_id` es 0x414D4F44 y `user_version` coincide con schemaVersion

#### Scenario: Módulo sin licencia declarada
- **WHEN** el ETL procesa un módulo cuyo manifest carece de license/copyright/source
- **THEN** la construcción falla y no se publica

### Requirement: ETL desde fuentes SWORD de CrossWire

El sistema SHALL convertir módulos SWORD (drivers zText4/zCom4, RawText, rawld4) a .amod
con texto plano sin marcado, mapeo canónico de 66 libros, extracción de headings y notas,
verificando contra versículos esperados.

#### Scenario: Conversión de una Biblia zText4
- **WHEN** se importa el módulo ASV de CrossWire
- **THEN** Genesis 1:1, Psalm 119:105 y Revelation 22:21 contienen los textos esperados
  y el total de versículos coincide con el canon de 66 libros

#### Scenario: Búsqueda sin diacríticos
- **WHEN** se consulta el FTS5 de un módulo con "Jesus" en un texto con "Jesús"
- **THEN** el tokenizador unicode61 remove_diacritics 2 empareja ambas formas

### Requirement: Catálogo oficial publicado

El sistema SHALL generar `catalog/catalog.json` con id, type, language, license, sha256,
sizeBytes y downloadUrl de cada módulo publicado vía GitHub Releases, y SHALL mantener
evidencia de licencia por módulo en docs/provenance/.

#### Scenario: Regeneración del catálogo
- **WHEN** se ejecuta build-catalog tras construir los módulos
- **THEN** catalog.json refleja hashes reales de dist/ y URLs de la release vigente

#### Scenario: Integridad al descargar
- **WHEN** la app descarga un .amod desde el catálogo
- **THEN** el sha256 del archivo coincide con el declarado en catalog.json
