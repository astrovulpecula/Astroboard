## Objetivo

Traducir al inglés (cuando `language === 'en'`) todos los textos que ahora están fijos en español en la aplicación, no solo el sidebar/dashboard. Hoy hay cientos de cadenas hardcoded (labels, placeholders, títulos de modales, columnas de tabla, leyendas de gráficas, plantilla HTML de reportes), por lo que el trabajo se hace por fases para poder revisarlo sin romper nada.

## Estrategia

1. **Ampliar `src/lib/i18n.ts`** con todas las claves nuevas que faltan, organizadas por sección (objects-form, project-form, session-form, session-details, metrics-cards, gallery, planning, forecast, reports…). Mantengo el formato actual `translations.es` / `translations.en` y el tipo `TranslationKey`.
2. **Sustituir literales por `t('clave')` en `src/components/AstroTracker.tsx`** sección a sección, manteniendo intacto cualquier valor de negocio (IDs, claves de filtros internos como `"proximo"`, formatos de fecha, nombres de cámaras/telescopios introducidos por el usuario, etc.).
3. **Traducir también los textos generados dinámicamente** en la exportación HTML/PDF de reportes (función que construye `<h2 class="section-title">…</h2>` y las cards), pasando el idioma actual al generador.
4. **Revisar componentes auxiliares** referenciados desde AstroTracker que pinten texto en español: `VisibilityChart`, `MultiObjectVisibilityChart`, `FitsCharts`, `PHD2Charts`, `FitsAnalyzer`, `PHD2Analyzer`, `RatingGallery`. Cada uno que no use ya `useLanguage()` lo recibirá vía contexto.
5. **No tocar** el flujo de beta/auth (`src/beta/**`) salvo strings visibles ya solicitados anteriormente; no cambia lógica de almacenamiento, sync ni parsing de fechas.

## Fases de entrega

Para que sea revisable y reversible, lo entrego en tandas (cada una compila y queda usable):

- **Fase 1 — Núcleo visible**: Sidebar, Dashboard (saludo, luna, objetos visibles, efemérides, carrusel, visibilidad nocturna), pestañas superiores, sección Configuración, botones de cabecera (export/import/tema/idioma).
- **Fase 2 — Objetos y Galería**: cabeceras, filtros, tarjetas, tabla, modal "Nuevo objeto", modal "Editar objeto", filtros de valoración.
- **Fase 3 — Planificación y Pronóstico**: tarjetas de proyectos planificados, filtros (Próximo/Activo/etc.), modal "Nuevo proyecto", labels meteo, leyendas Hoy/Ahora/Por días.
- **Fase 4 — Métricas/Estadísticas**: títulos de cada tarjeta (SNR Récord, Horas por Año, Objeto Más Fotografiado, etc.), labels de gráficas y ejes.
- **Fase 5 — Sesiones y detalles**: modal "Nueva sesión", modal "Detalles de sesión" (Análisis FITS, PHD2, RMS, columnas Cámara/Exposición/Lights sesión/Tiempo sesión, etc.).
- **Fase 6 — Reportes/Exportación**: títulos del HTML generado (Estadísticas del Proyecto, Exposición Total, Localización, Cámara, Imágenes de Filtros, Exposición por Filtro, Lights por Sesión, Iluminación Lunar, Temperatura, Humedad, Viento, SNR Medio, SNR RGB, Horas Sesión…).

## Detalles técnicos

- Las claves nuevas seguirán camelCase (`projectStatusUpcoming`, `sessionDetailsTitle`, `fitsAnalysisHeading`, `reportTotalExposure`, etc.).
- Donde haya textos compuestos uso interpolación simple (`t('visibleObjectsIn') + " " + currentMonthName`) para no introducir un sistema de plantillas nuevo.
- Los nombres de meses y fases lunares ya se formatean con utilidades que aceptan `language`; se reutilizan.
- Plantilla del informe: paso `language` al builder y construyo los literales con un helper `r(key)` interno para no acoplarlo a React.
- No se altera el almacenamiento; el idioma se sigue guardando en `astroTrackerSettings.language` vía `useLanguage`.
- Riesgo principal: confundir un literal de UI con una clave interna (p.ej. un `value="proximo"` de un `<option>` no se traduce, solo su texto visible). Se revisa caso por caso.

## Verificación

Tras cada fase: build limpio, abrir la sección afectada en preview y cambiar idioma con el selector de Configuración para confirmar que todos los textos visibles cambian a inglés y vuelven al español.

## Fuera de alcance

- Traducción del catálogo CSV de objetos (nombres comunes en castellano del archivo de datos).
- Mensajes de error provenientes de Supabase/Auth.
- Cualquier cambio de diseño o de lógica no estrictamente necesario para la i18n.