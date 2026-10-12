# Guía para Agentes de IA - Proyecto Refaccionaria Rubi

Este documento sirve como referencia para los asistentes de IA que colaboren en este proyecto. Contiene información sobre la arquitectura, convenciones y flujos de trabajo críticos.

## 🛠 Stack Tecnológico
- **Frontend**: React (Vite) + TypeScript
- **Estilos**: Vanilla CSS / Tailwind CSS (según el componente)
- **Base de Datos**: Supabase (PostgreSQL)
- **Generación de Documentos**: jsPDF + jspdf-autotable
- **Notificaciones**: react-hot-toast
- **Iconos**: Lucide React

## 📂 Estructura del Proyecto
- `/src/components`: Componentes reutilizables.
    - `Catalogue.tsx`: Componente principal del catálogo con filtros y exportación.
    - `CatalogueItem.tsx`: (Si existe) Representación de un producto.
- `/src/utils`: Utilidades generales.
    - `pdfGenerator.ts`: Lógica base para generar PDFs de pedidos.
- `/src/store`: Gestión de estado (Zustand/useStore).
- `/supabase/functions`: Edge Functions para lógica de servidor (notificaciones, borrado de usuarios).

## 🚀 Flujos Críticos

### Exportación de Catálogo (PDF/CSV)
Ubicado en `src/components/Catalogue.tsx` y `src/utils/pdfCatalogGenerator.ts`.
- **Carga de Imágenes Robusta**: Se descargan con `fetch` (`mode: 'cors'`), timeout con `AbortController` (8s) y 2 reintentos con backoff exponencial, convirtiéndose a `Blob` local (`URL.createObjectURL`) para evitar envenenamiento de caché CORS o canvas tainted.
- **Batching & Throttling**: Se procesan en lotes controlados de 8 imágenes concurrentes con una micro-pausa de 40ms entre lotes para no saturar los sockets del navegador ni disparar rate-limiting de Cloudflare.
- **Compresión**: Las imágenes se redimensionan a 200px/300px y se comprimen como JPEG (70% calidad) antes de incluirse en el PDF.
- **Fallbacks**: Si una imagen falla o no existe, se dibuja un recuadro limpio con la leyenda "SIN IMAGEN" (o "S/I" en tabla) en vez de dejar recuadros en blanco.
- **Permisos**: La visibilidad de precios en la exportación depende del estado `isApproved` del perfil del usuario.

### Importación Masiva de Pedidos (Excel / CSV)
Ubicado en `src/components/ImportOrderModal.tsx`, integrado en `src/components/Layout.tsx` (panel del carrito).
- **Formatos**: `.xlsx`, `.xls`, `.csv` (procesados client-side con librería `xlsx`).
- **Columnas**: Reconocimiento flexible de "No Parte" (mapeado a `sku`) y "Cantidad".
- **Comportamiento**: Suma cantidades a ítems que ya estén en el carrito (`useStore.addMultipleToCart`), respeta tope de stock disponible en `productos` y descarta o alerta los agotados/no encontrados.
- **Control de Acceso**: Controlado por `canImportOrders = profile?.rol === 'admin' || profile?.permisos?.importar_pedidos`. Administrable desde el panel `/admin` para roles `cliente` y `empleado`.

### Gestión de Inventario
- El stock se maneja directamente desde Supabase.
- Los filtros de búsqueda utilizan `fts_vector` (Full Text Search) en PostgreSQL para mayor eficiencia.

## 📝 Convenciones de Código
- **Tipado**: Mantener tipado estricto en TypeScript.
- **Estilos**: Priorizar el uso de clases personalizadas (`card-rubi`, `btn-primary`, `input-rubi`) definidas en `index.css` para mantener la consistencia visual de la marca.
- **Asincronía**: Usar `try-catch-finally` en operaciones de exportación o llamadas a base de datos para asegurar que los estados de carga (`loading`, `exporting`) siempre se reseteen.

## ⚠️ Notas Importantes
- **Límites de Memoria**: El navegador tiene límites para generar PDFs muy grandes (>1000 imágenes). Siempre advertir al usuario o sugerir filtrado si el `totalCount` es muy elevado.
- **CORS**: Al procesar imágenes externas para el PDF, asegurar que el servidor de origen permita CORS (`crossOrigin="anonymous"`).

---
*Documento generado por Antigravity AI - Mayo 2026*
