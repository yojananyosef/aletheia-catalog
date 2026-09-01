# Política de contenido — aletheia-catalog

El software es libre; el contenido es de sus autores. Este catálogo distribuye módulos y
cada módulo declara su licencia. Modelo basado en la política de The SWORD Project /
CrossWire Bible Society (25 años operando esta dinámica), adaptado a un catálogo gratuito.

## Principios

1. **La app no es el publisher.** El catálogo distribuye; cada módulo declara
   `license`, `copyright`, `source` y `attribution` en su manifiesto (AMF v1).
2. **Solo entra contenido verificable**: dominio público, CC0, o Creative Commons con los
   términos declarados. Nunca contenido copyright sin permiso explícito por escrito.
3. **La ficha manda.** La licencia se muestra siempre al usuario antes de instalar y desde
   la app ("Acerca de este módulo"). Una fuente de verdad: el manifest del módulo.
4. **Ante la duda, fuera.** Si un recurso es ambiguo, se retira del catálogo hasta
   aclarar su estado (práctica de auditoría de CrossWire).
5. **Contacto público.** `copyright@aletheia.app` (buzón dedicado) listado en el README y
   en la app para reportes de infracción. Se responde y retira sin fricción.

## Vetting de un módulo nuevo (checklist)

- [ ] Identificar la fuente original y su fecha de publicación
- [ ] Determinar el estado de copyright (PD por antigüedad / CC / permiso escrito)
- [ ] Guardar evidencia (URL de la fuente, copia del permiso si existe) en `docs/provenance/`
- [ ] Registrar `license` + `copyright` + `source` + `attribution` en el manifest
- [ ] Doble verificación por otra persona antes de publicar en `catalog.json`
- [ ] Si es "se cree PD": anotarlo explícitamente y priorizar fuentes académicas (CCEL, CrossWire, eBible.org)

## Disclaimers

En la app, sección Biblioteca:

> Los módulos disponibles provienen de fuentes de dominio público o con licencias abiertas,
> y se distribuyen "tal cual" con su licencia declarada. Si crees que algún contenido
> infringe derechos, contáctanos en copyright@aletheia.app y lo retiraremos.

Fuente de inspiración literal (CrossWire, Install Manager): los repositorios de terceros
pueden contener módulos no legítimamente distribuibles; el responsable es quien publica el
repositorio. **v1 solo distribuye el catálogo oficial vetado por este documento** —
catálogos de terceros quedan fuera de alcance hasta diseñar el flujo de disclaimer
correspondiente.

## Hospedaje

El catálogo vive en GitHub Releases de este repo. Cualquier reclamación DMCA se procesa
por el mecanismo estándar de GitHub (notice-and-takedown). La app es un lector que
descarga desde URLs del catálogo; no re-hospeda contenido en servidores propios.

## Estado por módulo v1

| id | Fuente | Licencia | Evidencia |
|----|--------|----------|-----------|
| ASV | CrossWire SWORD `ASV` | PublicDomain (1901) | crosswire.org ModInfo |
| KJV | CrossWire SWORD `KJV` | PublicDomain (1769) | crosswire.org ModInfo |
| WEB | CrossWire SWORD `WEB` | PublicDomain | crosswire.org ModInfo |
| JFB | CrossWire SWORD `JFB` | PublicDomain | crosswire.org ModInfo |
| Vincent | CrossWire SWORD `Vincent` | PublicDomain | verificar en ETL |
| SME | CrossWire SWORD `SME` | PublicDomain | crosswire.org ModInfo |
| APF | CrossWire SWORD `APF` | PublicDomain (LightFoot) | verificar en ETL |
| Creeds | CCEL (textos PD) | PublicDomain | ccel.org |
| Smith | CrossWire SWORD `Smith` | PublicDomain (1884) | crosswire.org ModInfo |
