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
Ubicado en `src/components/Catalogue.tsx`.
- **Batching**: Para catálogos grandes (>300 items), se procesan las imágenes en lotes de 15 para evitar bloqueos de memoria.
- **Compresión**: Las imágenes se redimensionan a 200px y se comprimen como JPEG (60% calidad) antes de incluirse en el PDF.
- **Permisos**: La visibilidad de precios en la exportación depende del estado `isApproved` del perfil del usuario.

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
