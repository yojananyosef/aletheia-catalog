# AMF v1 — Alethia Module Format

Especificación del formato de módulos `.amod`. Un módulo es un paquete autocontenido,
verificable y reproducible: texto + metadatos de licencia en un solo archivo.

Diseñado desde cero aprendiendo de dos precedentes: el contenedor SWORD de CrossWire
(licencias declaradas por módulo, versificación canónica) y contenedores zip+SQLite
modernos (consulta aleatoria y búsqueda full-text nativas en móvil).

## 1. Contenedor

Un `.amod` es un archivo ZIP con exactamente dos entradas, en este orden:

| Orden | Entrada        | Requisito |
|------:|----------------|-----------|
| 1     | `manifest.json` | UTF-8, JSON sin BOM |
| 2     | `content.db`    | SQLite 3 conforme a la sección 3 |

Reglas del contenedor:

- Compresión DEFLATE nivel 9.
- **Determinismo**: timestamps de zip en época DOS cero (1980-01-01), sin campos extra,
  inserciones en orden fijo. Dos builds del mismo contenido producen el **mismo sha256**.
  Verificación obligatoria en CI: doble build + comparación de hash.
- Sin archivos huérfanos dentro del zip (sin `-wal`, `-shm`, `.DS_Store`, directorios).

## 2. `manifest.json`

```jsonc
{
  "amf": 1,                       // versión del formato (constante 1 en AMF v1)
  "schemaVersion": 1,             // versión del esquema SQL de content.db
  "minReaderVersion": 1,          // versión mínima de lector que puede abrirlo
  "id": "ASV",                    // slug estable, mayúsculas, único en el catálogo
  "type": "bible",                // bible | commentary | lexicon | dictionary | crossref | devotion
  "name": "American Standard Version",
  "shortName": "ASV",
  "language": "en",               // ISO 639-1/3
  "direction": "ltr",             // ltr | rtl
  "version": "1.0.0",             // versión del contenido del módulo
  "publisher": "CrossWire Bible Society",
  "license": "PublicDomain",      // SPDX / "CC-BY-4.0" / "CC0-1.0" / "PublicDomain" — obligatorio
  "copyright": "1901 American Standard Version, Public Domain",
  "source": "https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=ASV",
  "attribution": "American Standard Version (1901), Public Domain",
  "features": {
    "hasStrongs": false,
    "hasMorphology": false,
    "hasFootnotes": false,
    "hasHeadings": true
  },
  "dependencies": []              // reservado v1: siempre vacío
}
```

Reglas:

- `license` es **obligatorio y no vacío**. Valores aceptados: cadena SPDX válida,
  `CC0-1.0`, o `PublicDomain`. La app muestra `attribution` + `license` siempre.
- Sin timestamp de build en el manifest (rompería el determinismo); la fecha de generación
  vive en `catalog.json`.
- Campos no reconocidos: los lectores DEBEN ignorarlos (evolución compatible).

## 3. `content.db`

SQLite 3 con esta configuración obligatoria:

```sql
PRAGMA page_size = 8192;        -- antes de crear tablas
PRAGMA journal_mode = DELETE;   -- sin residuos WAL al distribuir
-- al cerrar: PRAGMA application_id = 1096035140;  -- 0x414D4F44 'AMOD'
--            PRAGMA user_version = 1;            -- = schemaVersion
--            VACUUM;
```

`application_id` del formato: `0x414D4F44` ("AMOD", 1096035140). El lector detecta el
formato con este valor y rechaza archivos inválidos.

### 3.1 Tablas comunes

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;
-- claves obligatorias: id, type, language, name, shortName, license, attribution
-- (espejo del manifest: permite abrir content.db sin descomprimir nada más)

CREATE TABLE books (
  bookId       INTEGER PRIMARY KEY,
  osisCode     TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  testament    TEXT NOT NULL CHECK (testament IN ('OT','NT')),
  bookOrder    INTEGER NOT NULL,
  chapterCount INTEGER NOT NULL
) WITHOUT ROWID;
```

`books` está poblada con el canon completo del módulo en orden canónico, de modo que el
consumidor no necesita conocimiento de versificación externa.

### 3.2 type = bible

```sql
CREATE TABLE verses (
  bookId  INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse   INTEGER NOT NULL,
  verseEnd INTEGER,             -- NULL = versículo simple; si hay rango, = último versículo
  text    TEXT NOT NULL,        -- UTF-8 plano, sin marcado, una línea
  strongs TEXT,                 -- reservado; NULL en v1
  UNIQUE (bookId, chapter, verse)
);

CREATE TABLE sections (         -- encabezados de sección (headings)
  bookId   INTEGER NOT NULL,
  chapter  INTEGER NOT NULL,
  beforeVerse INTEGER NOT NULL, -- el título antecede a este versículo
  title    TEXT NOT NULL,
  PRIMARY KEY (bookId, chapter, beforeVerse)
) WITHOUT ROWID;

CREATE TABLE footnotes (
  id      INTEGER PRIMARY KEY,
  bookId  INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse   INTEGER NOT NULL,
  caller  TEXT NOT NULL,
  text    TEXT NOT NULL
);

CREATE VIRTUAL TABLE verses_fts USING fts5(
  text,
  bookId UNINDEXED, chapter UNINDEXED, verse UNINDEXED, verseEnd UNINDEXED,
  content='verses', content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);
-- triggers de sincronía AFTER INSERT/DELETE/UPDATE ON verses → verses_fts
```

Reglas de contenido:

- `text` es **texto plano**: sin XML/OSIS/GBF, sin entidades HTML, sin saltos de línea
  internos, espacios colapsados. Los derechos de presentación (itálicas, palabras de Jesús
  en rojo) quedan fuera de v1 por diseño.
- Columna `strongs` de `verses`: reservada, siempre NULL (los Strong por palabra viven
  en la tabla `words` de §3.7, solo schemaVersion 2).
- Búsqueda: `unicode61 remove_diacritics 2` — "Jesús" coincide con "Jesus" y "Jesús"
  es equivalente a "jesus" en español.
- FTS5 usa external content sobre `verses` (sin duplicar el texto, DB más pequeña).

### 3.3 type = commentary

```sql
CREATE TABLE entries (
  bookId  INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse   INTEGER NOT NULL,
  text    TEXT NOT NULL,
  UNIQUE (bookId, chapter, verse)
);
-- + verses_fts equivalente (external content sobre entries)
```

### 3.4 type = dictionary | lexicon

```sql
CREATE TABLE entries (
  key     TEXT PRIMARY KEY,     -- clave de lookup (p.ej. "H1", "grace")
  sortKey TEXT NOT NULL,        -- clave plegada (minúsculas, sin diacríticos) para ordenar
  strongs TEXT,                 -- p.ej. "G26" si aplica; NULL si no
  content TEXT NOT NULL,
  UNIQUE (sortKey, key)
);
-- + entries_fts (content='entries', sobre content y key)
```

### 3.5 type = devotion

```sql
CREATE TABLE entries (
  month     INTEGER NOT NULL,   -- 1..12
  day       INTEGER NOT NULL,   -- 1..31
  title     TEXT NOT NULL,
  scripture TEXT,               -- referencia libre, p.ej. "Ps 119:105"
  content   TEXT NOT NULL,
  PRIMARY KEY (month, day)
) WITHOUT ROWID;
```

### 3.6 type = crossref (reservado v1.1)

Misma estructura de `entries` con columnas `fromBook/fromChapter/fromVerse` y
`toOsis` normalizado. No se publica en v1.

### 3.7 Tabla `words` — Strong por palabra (AMF v1.1, schemaVersion 2)

Solo `type = bible`. Tablas `verses`/`sections`/`footnotes` y FTS idénticos a v1;
`words` es **aditiva**: un módulo schemaVersion 1 nunca la contiene.

```sql
CREATE TABLE words (
  bookId   INTEGER NOT NULL,
  chapter  INTEGER NOT NULL,
  verse    INTEGER NOT NULL,
  position INTEGER NOT NULL,   -- 1-based: orden del <w> dentro del versículo
  surface  TEXT NOT NULL,       -- forma superficial en texto plano
  strongs  TEXT,                -- "H7225" | "G3056" normalizado (sin ceros); NULL si no aplica
  lemma    TEXT,                -- lema no-Strong ("λόγος"); NULL si no aplica
  morph    TEXT,                -- código morfológico tal cual ("V-PAI-3S"); NULL si no aplica
  PRIMARY KEY (bookId, chapter, verse, position)
);
CREATE INDEX idx_words_strongs ON words(strongs, bookId, chapter, verse) WHERE strongs IS NOT NULL;
CREATE INDEX idx_words_lemma ON words(lemma, bookId, chapter, verse) WHERE lemma IS NOT NULL;
```

Reglas:

- Fuente: elementos `<w lemma="..." morph="...">superficie</w>` estilo WLC/SBLGNT/WHNU.
  `lemma="strong:H07225"` → `strongs="H7225"` (prefijo fuera, ceros fuera);
  `lemma` conserva el primer token no-Strong si lo hay. Estilo
  `<sync type="Strongs">` (KJV et al.): fuera de v1.1.
- `position` cuenta solo `<w>` con superficie no vacía, reinicia en 1 por versículo.
- El ETL inserta en orden `(bookId, chapter, verse, position)` (el builder lo reordena
  igualmente: el build es determinista ante cualquier orden de entrada).
- Consultas canónicas: usos de un Strong
  (`WHERE strongs = 'G3056' ORDER BY bookId, chapter, verse`), morfología
  (`WHERE morph LIKE 'V-%'`), palabra↔versículo por PK.
- Sin FTS sobre `words` en v1.1 (búsqueda exacta por índice B-tree basta para
  `strongs:`/`lema:` del DSL; FTS sigue solo sobre `verses.text`).

## 4. Versificación

- `books` usa códigos OSIS. El orden canónico va en `bookOrder`.
- Los módulos fuente SWORD con versificación KJV (66 libros) se mapean 1:1.
- Introducciones del módulo/testamento/libro/capítulo de SWORD: **fuera de v1**
  (no se almacenan); documentado como decisión.

## 5. Ciclo de vida

1. **Construcción**: ETL determinista → `.amod` en `dist/` → doble build + comparación de sha256.
2. **Publicación**: `dist/<id>.amod` commiteado en git; `catalog/catalog.json`
   actualizado con `sha256`, `sizeBytes` y `downloadUrl`. El canal es
   `https://raw.githubusercontent.com/.../<tag>/dist` (CORS `*`, tag inmutable).
   Prohibido `github.com/.../releases/...` como `releaseBase`: no envía
   `Access-Control-Allow-Origin` y rompe la descarga en web.
3. **Consumo**: la app descarga, verifica sha256, descomprime y abre `content.db` con
   `immutable=1` (solo lectura, sin journal).

## 6. Evolución

- `schemaVersion` incrementa con cambios de esquema; `amf` solo con cambios de contenedor.
  - v1 → v1.1: `schemaVersion` 1 → 2, único cambio = tabla `words` (+2 índices) en
    `type=bible`. `verses`, FTS, zip y manifest son byte-idénticos: los `.amod` v1.0.0
    publicados siguen válidos sin reconstruir.
  - `minReaderVersion` DEBE igualar `schemaVersion` (el reader valida `user_version`).
- Lectores viejos (`READER_SCHEMA_VERSION = 1`) rechazan `user_version = 2` con
  "actualiza la app": la app hermana debe subir su `READER_SCHEMA_VERSION` a 2
  (aceptando 1 y 2) antes de publicar el primer módulo con palabras.
- Los lectores ignoran campos desconocidos en manifest y tablas desconocidas en content.db.
- Extensión reservada: módulos de audio/general-book en AMF v2 (fuera de alcance).
