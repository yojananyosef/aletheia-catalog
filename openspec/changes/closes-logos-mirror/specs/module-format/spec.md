## ADDED Requirements

### Requirement: ETL manual CCEL/sacred-texts para los diferidos sin fuente SWORD

El sistema SHALL construir VINCENT, APF y CREEDS desde fuentes PD de CCEL y
sacred-texts (sin drivers SWORD), con parsing determinista y texto plano sin
marcado, y SHALL rechazar la construcción si faltan los checks de contenido.

#### Scenario: Vincent cubre Juan 1:1

- **WHEN** se importa VINCENT desde sacred-texts
- **THEN** la entrada (John, 1, 1) existe y su texto contiene "In the beginning was"

#### Scenario: APF expone los 15 documentos por sección

- **WHEN** se importa APF desde el TXT de CCEL
- **THEN** existen las claves `1 Clem. 1`, `Did. 1`, `IgnEph. 1` con contenido no
  vacío y el total de entradas es 274

#### Scenario: Creeds expone credos y catecismo

- **WHEN** se importa CREEDS desde el TXT de CCEL
- **THEN** existen las claves `Apostles' Creed`, `Nicene Creed`,
  `Athanasian Creed`, `Heidelberg Q1` y `Belgic Art I` con contenido no vacío

#### Scenario: Fuentes sin licencia PD verificada

- **WHEN** la cabecera CCEL no declara `Rights: Public Domain`
- **THEN** la construcción falla y no se publica (regla: sin evidencia, sin
  publicación)

### Requirement: Modelo AMF sin cambios de esquema para libros generales

El sistema SHALL modelar VINCENT como `commentary` (entradas dispersas por
versículo, solo NT) y APF/CREEDS como `dictionary` (clave estable por sección,
orden de fuente), todo en `schemaVersion 1`, con doble build sha256 idéntico.

#### Scenario: Doble build reproducible de los tres

- **WHEN** se construye cada módulo dos veces desde la misma fuente descargada
- **THEN** ambos `.amod` tienen sha256 idéntico

#### Scenario: Catálogo de 17 módulos

- **WHEN** se ejecuta `build-catalog` tras construir los tres
- **THEN** `catalog.json` contiene 17 módulos con sha256 reales y los diferidos
  originales desaparecen de la lista pendiente
