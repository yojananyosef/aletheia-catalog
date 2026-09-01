# Investigación: modelo de negocio Logos → versión gratuita (2026)

Fecha: 2026-09-01. Objetivo: entender el esqueleto completo de Logos (es.logos.com /
logos.com) para replicar la experiencia y estructura con un modelo gratuito y abierto.

## El producto

- Plataforma de estudio bíblico: app desktop + web + móvil, con biblioteca de recursos
  (Biblias, comentarios, diccionarios, devocionales, cursos) y herramientas enlazadas.
- **250.000+ libros y cursos**, **6M de usuarios**, updates cada ~6 semanas.
- Free edition: app gratis + biblioteca de 25+ recursos (valor de catálogo $199.37).
  Contenido del free tier: casi 100% dominio público —
  - 4 Biblias EN: ASV (1901), CSB, ESV, KJV → de estas, solo ASV y KJV son libres;
    CSB/ESV son copyright (Holman/Crossway) → nuestro sustituto PD: WEB.
  - 2 comentarios: JFB (PD), Vincent's Word Studies (PD)
  - 2 devocionales: Moment with God (Faithlife, copyright), Morning and Evening (PD)
  - Bible surveys: DIY Bible Study, I Dare You Not to Bore Me (Faithlife)
  - 1 audio: ESV Hear the Word (copyright)
  - Padres Apostólicos (PD), Credos históricos (PD), Smith's Dictionary imágenes (PD)

## Modelo de negocio (esqueleto)

1. **Entrada gratis** → free app + free library (embudo).
2. **Suscripciones** que amplían biblioteca y features: Premium $9.99/mo, Popular $14.99/mo,
   Max $19.99/mo (anual ~$69-139). La "biblioteca" es el producto: Standard / Learner /
   Leader / Preacher / Researcher + tracks denominacionales (Anglican, Baptist, Catholic
   (Verbum), Charismatic, Lutheran, Messianic Jewish, Orthodox, Reformed, SDA, Wesleyan).
3. **Store à la carte**: títulos individuales, colecciones, bundles temáticos,
   feature expansions. Pre-Pub: pre-publicación con precio escalonado (crowdfunde la
   producción del título antes de editarlo).
4. **Marketplace de editores independientes**: publishers venden su contenido vía Logos
   con contratos de royalties (agencias literarias confirman pagos puntuales).
5. **Marketing/growth**: Libro gratuito del mes (+ libro exclusivo suscriptores),
   ofertas mensuales, publisher spotlight, programa VIP, referidos, precio dinámico.
6. **Servicios**: Logos for Church/Ministry/Education, descuentos académicos, cursos
   (Logos Mobile Education), gift cards.
7. **Training gratuito como lock-in**: webinars, tutoriales, comunidad, soporte.
8. **AI**: Asistente de Estudio 24/7 ($0.27/día) sobre la biblioteca propia del usuario.
9. **Multi-idioma**: sitios es/pt/zh/kr/de/fr — expansión global con bibliotecas locales.

## Mapeo a Alethia Platform (todo gratis)

| Componente Logos | Alethia Platform |
|---|---|
| Free app + 25 recursos PD | App libre + catálogo oficial v1: mismo esqueleto (ASV, KJV, WEB, JFB, Vincent, SME, APF, Creeds, Smith) |
| Suscripciones / bibliotecas por perfil | No hay paywall; colecciones curadas por perfil (Lector/Predicador/Investigador) |
| Títulos individuales / bundles | Módulos `.amod` filtrables por tipo/idioma |
| Marketplace con royalties | v1: solo catálogo oficial vetado. Roadmap: publishers con manifiesto de licencia |
| Pre-Pub / Libro del mes | Peticiones de módulos (GitHub Issues) + lanzamiento mensual destacado |
| Asistente de Estudio AI | Roadmap: búsqueda semántica local (sqlite-vec), sin cloud |
| Training/comunidad | Docs + tutoriales en repo + GitHub Discussions |
| Desktop/web/mobile + OTA | Expo universal + EAS Update |

## Fuentes

- https://es.logos.com/ (propuesta de valor, planes, 6M usuarios, 250k libros)
- https://www.logos.com/free-edition (inventario completo del free tier con valores $)
- https://www.logos.com/get-started (precios suscripciones)
- https://sharperiron.org/filing/46716 (modelo for-profit, royalties a publishers)
- https://faithlife.com/history (evolución Cloud → suscripciones)
